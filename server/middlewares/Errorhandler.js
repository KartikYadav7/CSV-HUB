import multer from 'multer';
import { MAX_MB } from './upload.js';

export const notFound = (req, res) =>
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` } });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let { status = 500, code = 'INTERNAL_ERROR', message = err.message } = err;

  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    status = tooBig ? 413 : 400;
    code = err.code;
    message = tooBig ? `File is too large. The limit is ${MAX_MB} MB.` : err.message;
  } else if (!err.expose) {
    console.error(err);
    status = 500;
    message = 'Something went wrong on the server.';
  }
  res.status(status).json({ error: { code, message } });
};