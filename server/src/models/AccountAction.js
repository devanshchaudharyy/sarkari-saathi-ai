import mongoose from "mongoose";
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  purpose: { type: String, enum: ["reset", "verify"], required: true },
  tokenHash: { type: String, required: true, unique: true },
  emailAtIssue: { type: String, required: true },
  sessionVersion: { type: Number, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
schema.index({ user: 1, purpose: 1 }, { unique: true });
export default mongoose.model("AccountAction", schema);
