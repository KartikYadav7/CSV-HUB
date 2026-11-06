import PropTypes from 'prop-types';
import { FileSpreadsheet, Trash2 } from 'lucide-react';
import { formatBytes } from '../lib/csv';
import { glass } from './ui';

export default function DatasetList({ datasets, onOpen, onDelete }) {
  if (!datasets.length) return null;
  return (
    <section className={`${glass} mt-6 p-2`} aria-label="Saved datasets">
      <h2 className="px-3 pb-1 pt-2 text-sm font-medium text-slate-300">Saved datasets</h2>
      <ul>
        {datasets.map((d) => (
          <li key={d.id} className="flex items-center gap-1 rounded-xl hover:bg-white/5">
            <button onClick={() => onOpen(d.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-teal-300" />
              <span className="min-w-0">
                <span className="block truncate text-sm text-white">{d.name}</span>
                <span className="text-xs text-slate-500">{d.rowCount.toLocaleString()} rows · {formatBytes(d.size)} · {new Date(d.createdAt).toLocaleDateString()}</span>
              </span>
            </button>
            <button aria-label={`Delete ${d.name}`} onClick={() => onDelete(d)} className="mr-2 rounded-lg p-2 text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
DatasetList.propTypes = {
  datasets: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired, name: PropTypes.string.isRequired, rowCount: PropTypes.number.isRequired,
    size: PropTypes.number.isRequired, createdAt: PropTypes.string,
  })).isRequired,
  onOpen: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};