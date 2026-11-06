import mongoose from 'mongoose';

export const dbReady = () => mongoose.connection.readyState === 1;

export const connectDb = async (uri) => {
  if (!uri) {
    console.warn('MONGODB_URI not set: running without persistence.');
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
    return true;
  } catch (e) {
    console.error('MongoDB connection failed, running without persistence:', e.message);
    return false;
  }
};