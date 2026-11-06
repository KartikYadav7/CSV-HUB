import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Download, RotateCcw, Search, Database } from 'lucide-react';
import FileUpload from './components/FileUpload';
import DatasetList from './components/DatasetList';
import FilterBuilder from './components/FilterBuilder';
import DataTable from './components/DataTable';
import Pagination from './components/Pagination';
import DashboardSkeleton from './components/DashboardSkeleton';
import { btnGhost, field, glass } from './components/ui';
import { applyFilters, applySearch, exportCsv, formatBytes, inferTypes, sortRows } from './lib/csv';
import { deleteDataset, getDataset, listDatasets, uploadCsv } from './lib/api';

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2">
    <div className="text-lg font-semibold tabular-nums text-white">{value}</div>
    <div className="text-xs text-slate-400">{label}</div>
  </div>
);

export default function App() {
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | ready
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [data, setData] = useState(null); // { columns, rows, types, meta }
  const [datasets, setDatasets] = useState([]);
  const [rules, setRules] = useState([]);
  const [mode, setMode] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState([]); // [{ column, dir }] in priority order
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const refreshDatasets = useCallback(() => listDatasets().then((r) => setDatasets(r.datasets)).catch(() => {}), []);
  useEffect(() => { refreshDatasets(); }, [refreshDatasets]);

  const deferredRules = useDeferredValue(rules);
  const deferredSearch = useDeferredValue(search);
  const updating = deferredRules !== rules || deferredSearch !== search;

  const filtered = useMemo(
    () => (data ? applySearch(applyFilters(data.rows, deferredRules, mode), data.columns, deferredSearch) : []),
    [data, deferredRules, mode, deferredSearch],
  );
  const sorted = useMemo(() => (sort.length ? sortRows(filtered, sort, data.types) : filtered), [filtered, sort, data]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const pageRows = useMemo(() => sorted.slice(start, start + pageSize), [sorted, start, pageSize]);

  const show = ({ dataset, rows }) => {
    setData({ columns: dataset.columns, rows, types: inferTypes(dataset.columns, rows), meta: dataset });
    setRules([]); setMode('all'); setSearch(''); setSort([]); setPage(0);
    setStatus('ready');
  };

  const loadFile = useCallback(async (f) => {
    setError('');
    if (!/\.csv$/i.test(f.name)) return setError('That file isn’t a CSV. Choose a file ending in .csv.');
    setProgress(0);
    setStatus('uploading');
    try {
      const result = await uploadCsv(f, (p) => { setProgress(p); if (p >= 100) setStatus('processing'); });
      show(result);
      if (result.dataset.persisted) refreshDatasets();
    } catch (e) { setError(e.message); setStatus('idle'); }
  }, [refreshDatasets]);

  const openDataset = async (id) => {
    setError(''); setStatus('processing');
    try { show(await getDataset(id)); } catch (e) { setError(e.message); setStatus('idle'); refreshDatasets(); }
  };
  const removeDataset = async (d) => {
    if (!window.confirm(`Delete “${d.name}”? This can’t be undone.`)) return;
    try { await deleteDataset(d.id); setDatasets((ds) => ds.filter((x) => x.id !== d.id)); } catch (e) { setError(e.message); }
  };

  const changeRules = useCallback((r) => { setRules(r); setPage(0); }, []);
  // Click: single-column sort (asc → desc → off). Shift+click: add or cycle a column in a multi-sort.
  const toggleSort = useCallback((column, additive) => {
    setSort((s) => {
      const i = s.findIndex((x) => x.column === column);
      if (!additive) return i === -1 || s.length > 1 ? [{ column, dir: 'asc' }] : s[0].dir === 'asc' ? [{ column, dir: 'desc' }] : [];
      if (i === -1) return [...s, { column, dir: 'asc' }];
      return s[i].dir === 'asc' ? s.map((x, j) => (j === i ? { ...x, dir: 'desc' } : x)) : s.filter((_, j) => j !== i);
    });
    setPage(0);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-200 antialiased">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-teal-500/20 blur-[120px]" />
        <div className="absolute -right-32 top-1/3 h-[26rem] w-[26rem] rounded-full bg-sky-600/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {status === 'processing' && <DashboardSkeleton />}
        {(status === 'idle' || status === 'uploading') && (
          <FileUpload onFile={loadFile} error={error} progress={status === 'uploading' ? progress : null}>
            <DatasetList datasets={datasets} onOpen={openDataset} onDelete={removeDataset} />
          </FileUpload>
        )}
        {status === 'ready' && data && (
          <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-xl bg-teal-400/10 p-2.5 text-teal-300"><FileSpreadsheet className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold text-white">{data.meta.name}</h1>
                  <p className="flex items-center gap-2 text-sm text-slate-400">
                    {formatBytes(data.meta.size)}
                    {data.meta.persisted && <span className="inline-flex items-center gap-1 text-teal-300"><Database className="h-3.5 w-3.5" />Saved</span>}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Stat label="Total rows" value={data.rows.length.toLocaleString()} />
                <Stat label="Columns" value={data.columns.length} />
                <Stat label="Matching" value={sorted.length.toLocaleString()} />
                <button onClick={() => { setData(null); setStatus('idle'); }} className={btnGhost}><RotateCcw className="h-4 w-4" />New file</button>
              </div>
            </header>

            <FilterBuilder columns={data.columns} types={data.types} rules={rules} mode={mode}
              onRulesChange={changeRules} onModeChange={(m) => { setMode(m); setPage(0); }} />

            <section className={`${glass} overflow-hidden`} aria-label="Data table">
              <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type="search" aria-label="Search all columns" placeholder="Search all columns" value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }} className={`${field} w-full pl-9`} />
                </div>
                <p className="flex-1 text-sm text-slate-400" aria-live="polite">
                  {sorted.length === 0 ? 'No matching records' : (
                    <>Showing <b className="font-medium tabular-nums text-white">{(start + 1).toLocaleString()}–{(start + pageRows.length).toLocaleString()}</b> of{' '}
                      <b className="font-medium tabular-nums text-white">{sorted.length.toLocaleString()}</b> filtered records
                      <span className="text-slate-600"> · {data.rows.length.toLocaleString()} total</span></>
                  )}
                  <span className="ml-2 hidden text-xs text-slate-600 lg:inline">Shift+click headers to sort by several columns</span>
                </p>
                <button onClick={() => exportCsv(data.columns, sorted, data.meta.name)} disabled={!sorted.length} className={btnGhost}>
                  <Download className="h-4 w-4" />Export filtered CSV
                </button>
              </div>
              <div className={`transition-opacity ${updating ? 'opacity-60' : ''}`}>
                <DataTable columns={data.columns} types={data.types} rows={pageRows} startIndex={start}
                  sort={sort} onSort={toggleSort} onClearFilters={() => { changeRules([]); setSearch(''); }} />
              </div>
              <Pagination page={safePage} pageCount={pageCount} pageSize={pageSize} onPage={setPage}
                onPageSize={(n) => { setPageSize(n); setPage(0); }} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}