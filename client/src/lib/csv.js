import Papa from 'papaparse';

export const PAGE_SIZES = [10, 25, 50, 100];
export const OPERATORS = {
  contains: 'Contains',
  equals: 'Equals',
  startsWith: 'Starts with',
  gt: 'Greater than',
  lt: 'Less than',
};
// Operators offered depend on what the column actually contains.
export const OPS_BY_TYPE = {
  text: ['contains', 'equals', 'startsWith'],
  number: ['gt', 'lt', 'equals'],
};

export const toNum = (v) => {
  const s = String(v ?? '').replace(/[,$%\s]/g, '');
  if (s === '') return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

/** A column is "number" when ≥90% of its non-empty sampled values parse as numbers. */
export const inferTypes = (columns, rows) => {
  const sample = rows.slice(0, 500);
  return Object.fromEntries(
    columns.map((c) => {
      let filled = 0, nums = 0;
      for (const r of sample) {
        if (r[c] === '' || r[c] == null) continue;
        filled++;
        if (!Number.isNaN(toNum(r[c]))) nums++;
      }
      return [c, filled && nums / filled >= 0.9 ? 'number' : 'text'];
    }),
  );
};

// Rules compile to predicates once, so the per-row work stays minimal.
const compile = ({ column, op, value }) => {
  const t = value.trim().toLowerCase();
  const tn = toNum(t);
  return (row) => {
    const c = String(row[column] ?? '').trim().toLowerCase();
    switch (op) {
      case 'contains': return c.includes(t);
      case 'startsWith': return c.startsWith(t);
      case 'equals': { const n = toNum(c); return !Number.isNaN(tn) && !Number.isNaN(n) ? n === tn : c === t; }
      case 'gt':
      case 'lt': {
        const n = toNum(c);
        const d = !Number.isNaN(tn) && !Number.isNaN(n) ? n - tn : c.localeCompare(t, undefined, { numeric: true });
        return op === 'gt' ? d > 0 : d < 0;
      }
      default: return true;
    }
  };
};

export const applyFilters = (rows, rules, mode) => {
  const preds = rules.filter((r) => r.column && r.value.trim() !== '').map(compile);
  if (!preds.length) return rows;
  return rows.filter((row) => (mode === 'all' ? preds.every((p) => p(row)) : preds.some((p) => p(row))));
};

export const sortRows = (rows, sorts, types) => {
  const specs = sorts.map((s) => ({ col: s.column, m: s.dir === 'asc' ? 1 : -1, num: types[s.column] === 'number' }));
  const keyed = rows.map((r) => ({ r, k: specs.map((s) => (s.num ? toNum(r[s.col]) : String(r[s.col] ?? ''))) }));
  const empty = (k, num) => (num ? Number.isNaN(k) : k === '');
  keyed.sort((a, b) => {
    for (let i = 0; i < specs.length; i++) {
      const { m, num } = specs[i];
      const x = a.k[i], y = b.k[i];
      const ex = empty(x, num), ey = empty(y, num);
      if (ex || ey) { if (ex !== ey) return ex ? 1 : -1; continue; } // blanks always sink
      const d = num ? x - y : x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });
      if (d) return m * d;
    }
    return 0;
  });
  return keyed.map((x) => x.r);
};

export const applySearch = (rows, columns, query) => {
  const t = query.trim().toLowerCase();
  if (!t) return rows;
  return rows.filter((r) => columns.some((c) => String(r[c] ?? '').toLowerCase().includes(t)));
};

export const exportCsv = (columns, rows, fileName) => {
  const csv = Papa.unparse({ fields: columns, data: rows.map((r) => columns.map((c) => r[c] ?? '')) });
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName.replace(/\.csv$/i, '') + '-filtered.csv' });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const formatBytes = (n) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;