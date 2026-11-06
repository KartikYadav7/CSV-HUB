import mongoose from 'mongoose';

// One document per CSV row. Values are stored positionally (aligned with Dataset.columns),
// so header names containing "." or "$" can never break Mongo field rules.
const recordSchema = new mongoose.Schema(
  {
    dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true },
    i: { type: Number, required: true },
    v: { type: [String], default: [] },
  },
  { versionKey: false },
);
recordSchema.index({ dataset: 1, i: 1 });

export default mongoose.model('Record', recordSchema);