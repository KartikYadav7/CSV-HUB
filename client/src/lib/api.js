import axios from 'axios';

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

const friendly = (err) =>
  new Error(
    err.response?.data?.error?.message ||
      (err.code === 'ERR_NETWORK' ? 'Can’t reach the server. Check that the API is running.' : err.message),
  );

// The API sends rows as arrays aligned with `columns`; the UI works with row objects.
const toObjects = (columns, rows) =>
  rows.map((v) => {
    const o = {};
    for (let i = 0; i < columns.length; i++) o[columns[i]] = v[i] ?? '';
    return o;
  });
const shape = ({ dataset, rows }) => ({ dataset, rows: toObjects(dataset.columns, rows) });

export async function uploadCsv(file, onProgress) {
  const body = new FormData();
  body.append('file', file);
  try {
    const { data } = await http.post('/csv/upload', body, {
      onUploadProgress: (e) => e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
    });
    return shape(data);
  } catch (e) { throw friendly(e); }
}

export async function listDatasets() {
  try { return (await http.get('/csv/datasets')).data; } catch (e) { throw friendly(e); }
}
export async function getDataset(id) {
  try { return shape((await http.get(`/csv/datasets/${id}`)).data); } catch (e) { throw friendly(e); }
}
export async function deleteDataset(id) {
  try { await http.delete(`/csv/datasets/${id}`); } catch (e) { throw friendly(e); }
}