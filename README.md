# CSV Intelligence Hub

A full-stack MERN app for uploading, saving and exploring CSV files. The Express API accepts uploads with Multer, streams them through `csv-parser`, and optionally stores them in MongoDB. The React client gives you drag-and-drop upload with progress, a multi-rule filter builder, global search, multi-column sorting, pagination and CSV export.

**Stack:** MongoDB, Express, React (Vite), Node.js, Tailwind CSS, Multer, Mongoose, Axios, lucide-react.

## Features

**Backend**
- Upload endpoint with a 25 MB limit and strict validation: `.csv` extension **and** an allowed MIME type.
- Streaming parse with `csv-parser`; blank headers get generated names and duplicate headers get numeric suffixes.
- Temp files use random names and are deleted in a `finally` block, whether parsing succeeds or fails.
- **Optional persistence.** With `MONGODB_URI` set, each upload is saved (metadata plus one document per row). Without it, the server still works and simply returns the parsed rows.
- Helmet, an origin allowlist for CORS, a 100 KB JSON body limit, and upload rate limiting (30 per 15 minutes per IP).
- Consistent JSON errors: `{ "error": { "code", "message" } }`.

**Frontend**
- Drag-and-drop upload with a real progress bar, then a skeleton loader while the server parses.
- Saved datasets list to reopen or delete earlier uploads.
- Multi-column filter builder with Match all / Match any. Operators adapt to the column type (numeric or text).
- Global search across all columns, combined with the filter rules.
- Click a header to sort; **Shift+click** to add more sort columns, with priority numbers shown.
- Sticky headers, horizontal and vertical scrolling, pagination (10, 25, 50, 100) with live counts.
- Client-side export of the filtered, sorted view to CSV.
- Error boundary, `prop-types` on every component, memoized filtering, `useDeferredValue` for responsive typing.

## Project structure

```
csv-hub/
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── server.js                  App setup, middleware, routes, startup
│   ├── config/db.js               Optional MongoDB connection
│   ├── models/
│   │   ├── Dataset.js             File metadata
│   │   └── Record.js              One document per CSV row
│   ├── routes/csv.routes.js       Upload, list, get, delete
│   ├── middleware/
│   │   ├── upload.js              Multer limits and validation
│   │   └── errorHandler.js        JSON error payloads
│   └── utils/
│       ├── AppError.js
│       └── parseCsvFile.js        Streaming CSV parser
└── client/
    ├── .env.example
    ├── vite.config.js             Proxies /api to the server in dev
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── lib/
        │   ├── api.js             Axios client with upload progress
        │   └── csv.js             Filters, multi-sort, search, export
        └── components/            FileUpload, DatasetList, FilterBuilder,
                                   DataTable, Pagination, DashboardSkeleton,
                                   ErrorBoundary, ui.js
```

## Getting started

Requires Node 18 or newer. MongoDB is optional.

### 1. API

```bash
cd server
npm install
cp .env.example .env     # then edit if needed
npm run dev              # http://localhost:5000
```

Check it is up: `curl http://localhost:5000/api/health` returns `{"ok":true,"persistence":true|false}`.

For persistence, run MongoDB locally or use Atlas, and put the connection string in `MONGODB_URI`.

### 2. Client

The client folder contains the source files; scaffold a Vite app and copy them over it.

```bash
npm create vite@latest client -- --template react
cd client
npm install axios papaparse lucide-react prop-types tailwindcss @tailwindcss/vite
```

1. Copy `src/` and `vite.config.js` from this project over the generated ones.
2. Replace `src/index.css` with `@import "tailwindcss";`.
3. Run `npm run dev` and open http://localhost:5173.

In development, Vite proxies `/api` to `http://localhost:5000`, so no CORS setup is needed. If your API runs elsewhere, set `VITE_PROXY_TARGET` when starting Vite.

## Environment variables

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `PORT` | server | `5000` | API port |
| `CLIENT_ORIGIN` | server | `http://localhost:5173` | Comma-separated list of allowed browser origins |
| `MONGODB_URI` | server | empty | Enables saving datasets. Leave empty to run without a database |
| `MAX_FILE_MB` | server | `25` | Upload size limit |
| `MAX_ROWS` | server | `500000` | Maximum rows accepted per file |
| `VITE_API_URL` | client | `/api` | API base URL. Needed in production when the API is on another origin |
| `VITE_PROXY_TARGET` | client (dev) | `http://localhost:5000` | Where the Vite dev proxy forwards `/api` |

## API reference

| Method and path | Description |
|---|---|
| `POST /api/csv/upload` | Multipart form, field name `file`. Returns `201` with `{ dataset, rows }` |
| `GET /api/csv/datasets` | Saved datasets, newest first. Returns `{ persistence, datasets }` |
| `GET /api/csv/datasets/:id` | Dataset metadata plus rows |
| `DELETE /api/csv/datasets/:id` | Deletes the dataset and its rows (`204`) |
| `GET /api/health` | Liveness and persistence status |

`rows` are arrays of values aligned with `dataset.columns`; the client converts them into row objects.

Example:

```bash
curl -F "file=@data.csv;type=text/csv" http://localhost:5000/api/csv/upload
```

### Error codes

| Status | Code | When |
|---|---|---|
| 400 | `NO_FILE` | No file in the `file` field |
| 400 | `INVALID_ID` | Malformed dataset id |
| 403 | `CORS_BLOCKED` | Origin not in `CLIENT_ORIGIN` |
| 404 | `DATASET_NOT_FOUND`, `NOT_FOUND` | Unknown dataset or route |
| 413 | `LIMIT_FILE_SIZE` | File over `MAX_FILE_MB` |
| 415 | `UNSUPPORTED_FILE` | Not a `.csv`, or MIME type not allowed |
| 422 | `EMPTY_CSV`, `TOO_MANY_ROWS`, `PARSE_ERROR` | File has no rows, too many rows, or can't be parsed |
| 429 | `RATE_LIMITED` | Too many uploads |
| 503 | `PERSISTENCE_DISABLED` | A save-related route was called without a database |

## Deploying

1. Build the client with `npm run build` and host `dist/` on any static host.
2. Run the server with `npm start` behind HTTPS.
3. Set `CLIENT_ORIGIN` on the server to your site's origin, and `VITE_API_URL` at client build time to the API's URL.

## Limitations

- **No authentication.** Anyone who can reach the API can list and delete every saved dataset. Add auth and per-user ownership before exposing it publicly.
- **Client-side data handling.** Filtering, sorting and export run in the browser, so the whole dataset is loaded there. Roughly 200,000 rows is a practical ceiling; beyond that, move filtering and sorting into MongoDB queries with server-side pagination.
- **Rate limiting is per IP and in memory.** Behind a proxy or load balancer, configure Express's `trust proxy`, and use a shared store if you run several instances.
- No automated tests are included.

## License

Add the license of your choice.