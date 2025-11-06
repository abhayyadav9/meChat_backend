import mongoose from 'mongoose';

const SuggestionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  suggestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  contactsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// expire doc after 15 minutes
SuggestionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15 * 60 });

const Suggestion = mongoose.model('Suggestion', SuggestionSchema);
export default Suggestion;
