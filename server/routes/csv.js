import fs from 'node:fs/promises';
import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import Dataset, { toDto } from '../models/dataset.js';
import Record from '../models/record.js';
import { dbReady } from '../config/db.js';
import { upload } from '../middlewares/upload.js';
import { AppError } from '../utils/AppError.js';
import { parseCsvFile } from '../utils/parseCsvFile.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const MAX_ROWS = Number(process.env.MAX_ROWS) || 500000;

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many uploads. Try again in a few minutes.' } },
});

const requireDb = (_req, _res, next) =>
  dbReady() ? next() : next(new AppError(503, 'PERSISTENCE_DISABLED', 'Saving datasets is not enabled on this server (no MongoDB connection).'));

const validId = (req, _res, next) =>
  mongoose.isValidObjectId(req.params.id) ? next() : next(new AppError(400, 'INVALID_ID', 'That dataset id isn’t valid.'));

// POST /api/csv/upload  (multipart field: "file")
router.post('/upload', uploadLimiter, upload, wrap(async (req, res) => {
  if (!req.file) throw new AppError(400, 'NO_FILE', 'Attach a CSV file in the "file" field.');
  try {
    const { columns, rows } = await parseCsvFile(req.file.path, { maxRows: MAX_ROWS });
    let dataset = {
      id: null, name: req.file.originalname, size: req.file.size,
      columns, rowCount: rows.length, createdAt: new Date(), persisted: false,
    };

    if (dbReady()) {
      const doc = await Dataset.create({ originalName: req.file.originalname, size: req.file.size, columns, rowCount: rows.length });
      try {
        for (let i = 0; i < rows.length; i += 1000) {
          const chunk = rows.slice(i, i + 1000).map((v, j) => ({ dataset: doc._id, i: i + j, v }));
          await Record.insertMany(chunk, { ordered: false, lean: true });
        }
      } catch (e) {
        await Promise.all([Dataset.deleteOne({ _id: doc._id }), Record.deleteMany({ dataset: doc._id })]);
        throw e;
      }
      dataset = toDto(doc);
    }
    res.status(201).json({ dataset, rows });
  } finally {
    await fs.unlink(req.file.path).catch(() => {}); // always remove the temp file
  }
}));

// GET /api/csv/datasets
router.get('/datasets', wrap(async (_req, res) => {
  if (!dbReady()) return res.json({ persistence: false, datasets: [] });
  const docs = await Dataset.find().sort({ createdAt: -1 }).limit(50).lean();
  res.json({ persistence: true, datasets: docs.map(toDto) });
}));

// GET /api/csv/datasets/:id  (metadata + rows)
router.get('/datasets/:id', requireDb, validId, wrap(async (req, res) => {
  const doc = await Dataset.findById(req.params.id).lean();
  if (!doc) throw new AppError(404, 'DATASET_NOT_FOUND', 'That dataset no longer exists.');
  const records = await Record.find({ dataset: doc._id }).sort({ i: 1 }).select('v -_id').lean();
  res.json({ dataset: toDto(doc), rows: records.map((r) => r.v) });
}));

// DELETE /api/csv/datasets/:id
router.delete('/datasets/:id', requireDb, validId, wrap(async (req, res) => {
  const doc = await Dataset.findByIdAndDelete(req.params.id);
  if (!doc) throw new AppError(404, 'DATASET_NOT_FOUND', 'That dataset no longer exists.');
  await Record.deleteMany({ dataset: doc._id });
  res.status(204).end();
}));

export default router;