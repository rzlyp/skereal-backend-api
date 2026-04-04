const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  beforeImage: {
    type: String,
    required: true
  },
  beforePrompt: {
    type: String,
    default: null
  },
  afterImage: {
    type: String,
    default: null
  },
  prompt: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  jobId: {
    type: String,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  processingTime: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

versionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

versionSchema.index({ projectId: 1, createdAt: -1 });

const Version = mongoose.model('Version', versionSchema);

module.exports = Version;
