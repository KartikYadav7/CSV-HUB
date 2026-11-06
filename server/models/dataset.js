import mongoose from 'mongoose';

const datasetSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    size: { type: Number, required: true },
    columns: { type: [String], required: true },
    rowCount: { type: Number, required: true },
  },
  { timestamps: true },
);

export const toDto = (d) => ({
  id: String(d._id),
  name: d.originalName,
  size: d.size,
  columns: d.columns,
  rowCount: d.rowCount,
  createdAt: d.createdAt,
  persisted: true,
});

export default mongoose.model('Dataset', datasetSchema);