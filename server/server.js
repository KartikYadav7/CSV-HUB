import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { connectDb, dbReady } from './config/db.js';
import { errorHandler, notFound } from './middlewares/Errorhandler.js';
import csvRoutes from './routes/csv.js';
import { AppError } from './utils/AppError.js';

const app = express();
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: origins,
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, persistence: dbReady() }));
app.use('/api/csv', csvRoutes);
app.use(notFound);
app.use(errorHandler);

await connectDb(process.env.MONGODB_URI);
const port = Number(process.env.PORT) || 5000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
