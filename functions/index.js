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

// Ghostscript preset mapping for the three user-facing compression presets
// best -> /prepress (300 DPI) - Best Quality, minimal compression
// balanced -> /ebook (150 DPI) - Balanced size/quality
// compressed -> /screen (72 DPI) - Maximum compression
const GS_PRESETS = {
  best:       '/prepress',
  balanced:   '/ebook',
  compressed: '/screen'
};

exports.compressPdf = onRequest(
  {
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 300,
    region: 'us-central1'
  },
  async (req, res) => {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
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

    // Map user-facing preset to Ghostscript flag; default to balanced if unknown
    const gsPreset = GS_PRESETS[preset] || GS_PRESETS.balanced;

    // Generate unique temp file names to prevent concurrent request collisions
    // CRITICAL: Never use static paths like /tmp/input.pdf — concurrent requests will corrupt
    const id = crypto.randomUUID();
    const inputPath = path.join(os.tmpdir(), `${id}-input.pdf`);
    const outputPath = path.join(os.tmpdir(), `${id}-output.pdf`);

    try {
      await fs.writeFile(inputPath, pdfBuffer);

      // Invoke Ghostscript via child_process.execFile (system binary at /usr/bin/gs)
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
        `-dPDFSETTINGS=${gsPreset}`,
        '-dEmbedAllFonts=true',
        '-dSubsetFonts=true',
        `-sOutputFile=${outputPath}`,
        inputPath
      ]);

      const compressedBuffer = await fs.readFile(outputPath);

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
