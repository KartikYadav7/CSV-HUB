import fs from 'node:fs';
import csv from 'csv-parser';
import { AppError } from './AppError.js';

/** Streams a CSV from disk. Resolves { columns, rows } where rows are arrays aligned with columns. */
export const parseCsvFile = (filePath, { maxRows }) =>
  new Promise((resolve, reject) => {
    const rows = [];
    const seen = new Map();
    let columns = [];
    const input = fs.createReadStream(filePath);
    const fail = (err) => {
      input.destroy();
      reject(err instanceof AppError ? err : new AppError(422, 'PARSE_ERROR', `Couldn’t parse this CSV: ${err.message}`));
    };

    const parser = csv({
      // Blank headers get a name; duplicate headers get a numeric suffix.
      mapHeaders: ({ header, index }) => {
        const base = header.trim() || `column_${index + 1}`;
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        return n ? `${base}_${n + 1}` : base;
      },
      mapValues: ({ value }) => value.trim(),
    });

    input.on('error', fail);
    parser
      .on('headers', (h) => { columns = h; })
      .on('data', (row) => {
        if (rows.length >= maxRows) return fail(new AppError(422, 'TOO_MANY_ROWS', `This file has more than ${maxRows.toLocaleString()} rows.`));
        rows.push(columns.map((c) => row[c] ?? ''));
      })
      .on('error', fail)
      .on('end', () => {
        if (!columns.length || !rows.length) {
          return reject(new AppError(422, 'EMPTY_CSV', 'No rows found. Check that the file has a header row and at least one data row.'));
        }
        resolve({ columns, rows });
      });
    input.pipe(parser);
  });
