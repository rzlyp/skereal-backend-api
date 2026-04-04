const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  originalImage: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: null
  },
  currentVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Version',
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

projectSchema.virtual('versions', {
  ref: 'Version',
  localField: '_id',
  foreignField: 'projectId'
});

projectSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

projectSchema.index({ userId: 1, createdAt: -1 });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
