import mongoose from "mongoose";
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  requestedAt: { type: Date, default: Date.now },
  completedAt: Date,
  expiresAt: { type: Date, expires: 0 },
});
export default mongoose.model("AccountDeletion", schema);
