// functions/index.js
// Ghostscript PDF compression via Firebase Cloud Functions 2nd gen
// Receives a PDF via multipart POST, compresses with Ghostscript, returns compressed PDF binary.

const { onRequest } = require('firebase-functions/v2/https');
const busboy = require('busboy');
const { execFile } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

const execFileAsync = promisify(execFile);

// --- Rate Limiting / Spike Detection ---
// In-memory sliding window — resets on cold start, self-heals within seconds under attack
const REQUEST_LOG = [];          // global timestamps
const IP_LOG = new Map();        // ip -> [timestamps]
const GLOBAL_LIMIT = 30;        // max requests per minute across all IPs
const PER_IP_LIMIT = 5;         // max requests per minute per IP
const WINDOW_MS = 60 * 1000;    // 1-minute sliding window

function isRateLimited(ip) {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // Prune global log
  while (REQUEST_LOG.length && REQUEST_LOG[0] < cutoff) REQUEST_LOG.shift();

  // Prune per-IP log
  const ipLog = IP_LOG.get(ip) || [];
  while (ipLog.length && ipLog[0] < cutoff) ipLog.shift();

  // Check limits
  if (REQUEST_LOG.length >= GLOBAL_LIMIT) return 'global';
  if (ipLog.length >= PER_IP_LIMIT) return 'ip';

  // Record this request
  REQUEST_LOG.push(now);
  ipLog.push(now);
  IP_LOG.set(ip, ipLog);
  return false;
}

// Ghostscript preset configurations — fully explicit, no -dPDFSETTINGS
// -dPDFSETTINGS overrides custom DPI flags, so we set ALL parameters manually.
// QFactor controls JPEG quality: 0.1 = best quality, 1.0 = worst quality
// Target savings are approximate — actual results depend on PDF content (image vs text ratio)
const GS_PRESETS = {
  best: {
    // Target: ~30% file size saving — minimal compression, highest quality
    dpi: 200,
    qfactor: 0.15
  },
  balanced: {
    // Target: ~50% file size saving — good balance
    dpi: 110,
    qfactor: 0.40
  },
  compressed: {
    // Target: ~90% file size saving — maximum compression
    dpi: 36,
    qfactor: 0.90
  }
};

exports.compressPdf = onRequest(
  {
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 300,
    region: 'us-central1',
    maxInstances: 2
  },
  async (req, res) => {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    // Spike detection — reject before any file parsing (near-zero cost)
    const clientIp = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const limited = isRateLimited(clientIp);
    if (limited) {
      return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
    }

    // Parse multipart form data using busboy
    // CRITICAL: Do NOT use Multer — it is broken in Cloud Functions (body pre-parsed by middleware)
    let pdfBuffer = null;
    let preset = 'balanced'; // default preset

    await new Promise((resolve, reject) => {
      const bb = busboy({
        headers: req.headers,
        limits: { fileSize: 50 * 1024 * 1024 } // 50 MB file size limit
      });

      bb.on('file', (fieldname, file, info) => {
        const chunks = [];
        file.on('data', chunk => chunks.push(chunk));
        file.on('end', () => {
          if (fieldname === 'pdf') {
            pdfBuffer = Buffer.concat(chunks);
          }
        });
      });

      bb.on('field', (fieldname, value) => {
        if (fieldname === 'preset') preset = value;
      });

      bb.on('close', resolve);
      bb.on('error', reject);

      // Dual-path: Cloud Functions production provides req.rawBody;
      // the local emulator may not — fall back to req.pipe(bb)
      if (req.rawBody) {
        bb.end(req.rawBody);
      } else {
        req.pipe(bb);
      }
    });

    // Validate that a PDF was actually received
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(400).json({ error: 'No PDF file received' });
    }

    // Map user-facing preset to config; default to balanced if unknown
    const presetConfig = GS_PRESETS[preset] || GS_PRESETS.balanced;

    // Generate unique temp file names to prevent concurrent request collisions
    // CRITICAL: Never use static paths like /tmp/input.pdf — concurrent requests will corrupt
    const id = crypto.randomUUID();
    const inputPath = path.join(os.tmpdir(), `${id}-input.pdf`);
    const outputPath = path.join(os.tmpdir(), `${id}-output.pdf`);

    try {
      await fs.writeFile(inputPath, pdfBuffer);

      // Invoke Ghostscript via child_process.execFile (system binary at /usr/bin/gs)
      // All parameters set explicitly — do NOT use -dPDFSETTINGS (it overrides custom flags)
      // CRITICAL flags:
      //   -q          : quiet, suppress normal output
      //   -dNOPAUSE   : no interactive pause between pages (required for non-interactive)
      //   -dBATCH     : exit after processing (required for non-interactive)
      //   -dSAFER     : restrict file access for security
      await execFileAsync('gs', [
        '-q',
        '-dNOPAUSE',
        '-dBATCH',
        '-dSAFER',
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        '-dEmbedAllFonts=true',
        '-dSubsetFonts=true',
        // Image downsampling
        '-dDownsampleColorImages=true',
        '-dDownsampleGrayImages=true',
        '-dDownsampleMonoImages=true',
        '-dColorImageDownsampleType=/Bicubic',
        '-dGrayImageDownsampleType=/Bicubic',
        '-dColorImageDownsampleThreshold=1.0',
        '-dGrayImageDownsampleThreshold=1.0',
        `-dColorImageResolution=${presetConfig.dpi}`,
        `-dGrayImageResolution=${presetConfig.dpi}`,
        `-dMonoImageResolution=${presetConfig.dpi}`,
        // JPEG quality via QFactor
        '-dAutoFilterColorImages=false',
        '-dAutoFilterGrayImages=false',
        '-dColorImageFilter=/DCTEncode',
        '-dGrayImageFilter=/DCTEncode',
        `-c`, `.setpdfwrite << /ColorACSImageDict << /QFactor ${presetConfig.qfactor} >> /GrayACSImageDict << /QFactor ${presetConfig.qfactor} >> >> setdistillerparams`,
        `-f`,
        `-sOutputFile=${outputPath}`,
        inputPath
      ]);

      const compressedBuffer = await fs.readFile(outputPath);

      // Guard: if compression made the file bigger, return the original
      if (compressedBuffer.length >= pdfBuffer.length) {
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'attachment; filename="compressed.pdf"');
        res.set('X-Compression-Note', 'already-optimal');
        return res.status(200).send(pdfBuffer);
      }

      // Return compressed PDF binary
      // CRITICAL: Use res.set() before res.send() — do not manually set headers after send
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', 'attachment; filename="compressed.pdf"');
      return res.status(200).send(compressedBuffer);

    } catch (err) {
      console.error('Ghostscript compression failed:', err);
      return res.status(500).json({ error: 'Compression failed' });

    } finally {
      // Always clean up temp files — even on error
      // Cloud Functions instances are reused; orphaned files accumulate in /tmp
      await fs.unlink(inputPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    }
  }
);
