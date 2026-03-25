// functions/index.js
// Ghostscript PDF compression via Firebase Cloud Functions 2nd gen
// Receives a PDF via chunked upload (bypasses Cloud Run's 32 MB request body limit).
//
// Upload flow for all files:
//   1. POST /uploadChunk  (repeat per 20 MB chunk) → { received: true }
//   2. POST /compressPdf  → { jobId, preset }  →  compressed PDF binary
//
// Each chunk is a multipart POST with fields: jobId, chunkIndex, plus a 'chunk' file.
// The function stores each chunk in Cloud Storage via admin SDK (no signing needed).
// compressPdf reassembles all chunks, runs Ghostscript, returns the result.

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const busboy = require('busboy');
const { execFile } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

const execFileAsync = promisify(execFile);

admin.initializeApp();

function getBucket() {
  return process.env.STORAGE_BUCKET
    ? admin.storage().bucket(process.env.STORAGE_BUCKET)
    : admin.storage().bucket();
}

// --- Rate Limiting / Spike Detection ---
const REQUEST_LOG = [];
const IP_LOG = new Map();
const GLOBAL_LIMIT = 60;
const PER_IP_LIMIT = 20;
const WINDOW_MS = 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  while (REQUEST_LOG.length && REQUEST_LOG[0] < cutoff) REQUEST_LOG.shift();
  const ipLog = IP_LOG.get(ip) || [];
  while (ipLog.length && ipLog[0] < cutoff) ipLog.shift();
  if (REQUEST_LOG.length >= GLOBAL_LIMIT) return 'global';
  if (ipLog.length >= PER_IP_LIMIT) return 'ip';
  REQUEST_LOG.push(now);
  ipLog.push(now);
  IP_LOG.set(ip, ipLog);
  return false;
}

// Ghostscript preset configurations
const GS_PRESETS = {
  best:       { dpi: 150, qfactor: 0.30 },
  balanced:   { dpi: 144, qfactor: 0.18 },
  compressed: { dpi: 36,  qfactor: 0.90 }
};

// Validate jobId: must be a standard UUID (prevents path traversal)
function isValidJobId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
}

// Parse a multipart request with busboy, resolving to { fields, fileBuffer }
// fileFieldName: name of the file field to capture
function parseMultipart(req, fileFieldName) {
  return new Promise((resolve, reject) => {
    const fields = {};
    let fileBuffer = null;

    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: 22 * 1024 * 1024 } // 22 MB per chunk max
    });

    bb.on('file', (fieldname, file) => {
      const chunks = [];
      file.on('data', chunk => chunks.push(chunk));
      file.on('end', () => {
        if (fieldname === fileFieldName) {
          fileBuffer = Buffer.concat(chunks);
        }
      });
    });

    bb.on('field', (name, value) => { fields[name] = value; });
    bb.on('close', () => resolve({ fields, fileBuffer }));
    bb.on('error', reject);

    if (req.rawBody) {
      bb.end(req.rawBody);
    } else {
      req.pipe(bb);
    }
  });
}

// ---------------------------------------------------------------------------
// uploadChunk — stores one chunk of a PDF upload into Cloud Storage.
// Each chunk must be ≤ 20 MB (well within Cloud Run's 32 MB body limit).
// Fields: jobId (UUID), chunkIndex (0-based integer), file field 'chunk'.
// ---------------------------------------------------------------------------
exports.uploadChunk = onRequest(
  {
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 120,
    region: 'us-central1',
    maxInstances: 10
  },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const clientIp = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    if (isRateLimited(clientIp)) {
      return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
    }

    let fields, fileBuffer;
    try {
      ({ fields, fileBuffer } = await parseMultipart(req, 'chunk'));
    } catch (err) {
      return res.status(400).json({ error: 'Failed to parse request' });
    }

    const { jobId, chunkIndex } = fields;

    if (!jobId || !isValidJobId(jobId)) {
      return res.status(400).json({ error: 'Invalid jobId' });
    }
    const idx = parseInt(chunkIndex, 10);
    if (isNaN(idx) || idx < 0 || idx > 999) {
      return res.status(400).json({ error: 'Invalid chunkIndex' });
    }
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'No chunk data received' });
    }

    // Store chunk: compress-temp/{jobId}/{0000}.chunk
    const paddedIdx = String(idx).padStart(4, '0');
    const objectName = `compress-temp/${jobId}/${paddedIdx}.chunk`;

    await getBucket().file(objectName).save(fileBuffer, {
      metadata: { contentType: 'application/octet-stream' }
    });

    return res.json({ received: true });
  }
);

// ---------------------------------------------------------------------------
// compressPdf — reassembles chunks from Cloud Storage, compresses with
// Ghostscript, and returns the compressed PDF binary.
// Body (JSON): { jobId: 'uuid', preset: 'balanced' }
// ---------------------------------------------------------------------------
exports.compressPdf = onRequest(
  {
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 300,
    region: 'us-central1',
    maxInstances: 2
  },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const clientIp = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    if (isRateLimited(clientIp)) {
      return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
    }

    const body = req.body;
    const jobId = body?.jobId;
    const preset = body?.preset || 'balanced';

    if (!jobId || !isValidJobId(jobId)) {
      return res.status(400).json({ error: 'Invalid or missing jobId' });
    }

    // List all chunks for this job
    const prefix = `compress-temp/${jobId}/`;
    let files;
    try {
      [files] = await getBucket().getFiles({ prefix });
    } catch (err) {
      console.error('Failed to list chunks:', err);
      return res.status(500).json({ error: 'Could not access storage' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No chunks found for jobId. Upload may have failed or expired.' });
    }

    // Sort by filename (padded index ensures correct order)
    files.sort((a, b) => a.name.localeCompare(b.name));

    // Download and concatenate all chunks
    let pdfBuffer;
    try {
      const chunkBuffers = await Promise.all(files.map(f => f.download().then(([d]) => d)));
      pdfBuffer = Buffer.concat(chunkBuffers);
    } catch (err) {
      console.error('Failed to download chunks:', err);
      return res.status(500).json({ error: 'Could not read uploaded chunks' });
    }

    // Delete all chunks (fire-and-forget)
    Promise.all(files.map(f => f.delete())).catch(err =>
      console.warn('Chunk cleanup failed:', err)
    );

    const presetConfig = GS_PRESETS[preset] || GS_PRESETS.balanced;
    const id = crypto.randomUUID();
    const inputPath = path.join(os.tmpdir(), `${id}-input.pdf`);
    const outputPath = path.join(os.tmpdir(), `${id}-output.pdf`);

    try {
      await fs.writeFile(inputPath, pdfBuffer);

      await execFileAsync('gs', [
        '-q', '-dNOPAUSE', '-dBATCH', '-dSAFER',
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        '-dEmbedAllFonts=true',
        '-dSubsetFonts=true',
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
        '-dAutoFilterColorImages=false',
        '-dAutoFilterGrayImages=false',
        '-dColorImageFilter=/DCTEncode',
        '-dGrayImageFilter=/DCTEncode',
        `-sOutputFile=${outputPath}`,
        '-c',
        `<< /ColorACSImageDict << /QFactor ${presetConfig.qfactor} >> /GrayACSImageDict << /QFactor ${presetConfig.qfactor} >> >> setdistillerparams`,
        '-f',
        inputPath
      ]);

      const compressedBuffer = await fs.readFile(outputPath);

      if (compressedBuffer.length >= pdfBuffer.length) {
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'attachment; filename="compressed.pdf"');
        res.set('X-Compression-Note', 'already-optimal');
        return res.status(200).send(pdfBuffer);
      }

      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', 'attachment; filename="compressed.pdf"');
      return res.status(200).send(compressedBuffer);

    } catch (err) {
      console.error('Ghostscript compression failed:', err);
      return res.status(500).json({ error: 'Compression failed' });

    } finally {
      await fs.unlink(inputPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    }
  }
);
