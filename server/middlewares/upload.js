import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';

export const MAX_MB = Number(process.env.MAX_FILE_MB) || 25;
const ALLOWED_MIME = new Set([
  'text/csv', 'application/csv', 'text/x-csv', 'application/x-csv',
  'application/vnd.ms-excel', // what Windows reports for .csv
  'text/plain',
]);

export const upload = multer({
  // Random temp names: the client-supplied filename never touches the file system.
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, _file, cb) => cb(null, `csvhub-${crypto.randomUUID()}.tmp`),
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = path.extname(file.originalname).toLowerCase() === '.csv' && ALLOWED_MIME.has(file.mimetype);
    cb(ok ? null : new AppError(415, 'UNSUPPORTED_FILE', 'Only .csv files are allowed.'), ok);
  },
}).single('file');