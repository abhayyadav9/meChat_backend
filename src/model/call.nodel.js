import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  callType: {
    type: String,
    enum: ["audio", "video"],
    default: "audio",
  },
  status: {
    type: String,
    enum: ["missed", "answered", "rejected"],
    default: "missed",
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number,
    default: 0, // duration in seconds
  },
}, {
  timestamps: true,
});

callSchema.pre('save', function(next){
    if(this.endTime && this.startTime){
        this.duration = Math.floor((this.endTime - this.startTime) / 1000);
    }
    next();
})

const Call = mongoose.model("Call", callSchema);

export default Call;
