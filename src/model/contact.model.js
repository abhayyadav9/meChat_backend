import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contacts: [
    {
      resourceName: String,
      names: [String],
      emails: [String],
      phones: [String],
      photo: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Contact = mongoose.model('Contact', ContactSchema);
export default Contact;
