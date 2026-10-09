import mongoose from "mongoose";
export const connectDB = (uri) =>
  mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
