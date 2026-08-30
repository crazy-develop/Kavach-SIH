const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true },
  correctAnswer: { type: String, required: true }, // 'A', 'B', 'C', 'D'
  subject: { type: String, required: true },
  chapter: { type: String, required: true },
  topic: { type: String },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  status: { 
    type: String, 
    enum: ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'RETIRED'], 
    default: 'DRAFT' 
  },
  marks: { type: Number, default: 4 },
  source: { type: String },
  sourceId: { type: String, unique: true, sparse: true }, // To handle idempotent seeding via stable ID (e.g. Q0001)
  
  // Review/audit tracking metadata
  submittedAt: { type: Date },
  reviewedAt: { type: Date },
  reviewedBy: { type: String }, // Firebase UID
  reviewComment: { type: String },
  approvedAt: { type: Date },
  approvedBy: { type: String }, // Firebase UID
  activatedAt: { type: Date },
  activatedBy: { type: String }, // Firebase UID
  retiredAt: { type: Date },
  retiredBy: { type: String } // Firebase UID
}, {
  timestamps: true // Auto-manages createdAt and updatedAt
});

// Database Indexes for optimized searching
questionSchema.index({ status: 1 });
questionSchema.index({ subject: 1 });
questionSchema.index({ chapter: 1 });
questionSchema.index({ topic: 1 });
questionSchema.index({ difficulty: 1 });

// Status Transition Rules
questionSchema.pre('save', function() {
  // Enforce starting status is always DRAFT for new questions
  if (this.isNew) {
    this.status = 'DRAFT';
    this._originalStatus = 'DRAFT';
    return;
  }

  if (this.isModified('status')) {
    const oldStatus = this._originalStatus || 'DRAFT';
    const newStatus = this.status;

    const allowedTransitions = {
      'DRAFT': ['UNDER_REVIEW'],
      'UNDER_REVIEW': ['APPROVED', 'DRAFT'], // allow correction/rejection back to DRAFT
      'APPROVED': ['ACTIVE', 'UNDER_REVIEW'], // allow rollback/modification
      'ACTIVE': ['RETIRED'],
      'RETIRED': []
    };

    if (!allowedTransitions[oldStatus] || !allowedTransitions[oldStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition: cannot change status from "${oldStatus}" to "${newStatus}"`);
    }
    
    this._originalStatus = this.status;
  }
});

// Populate original status on document instantiation/fetching
questionSchema.post('init', function(doc) {
  doc._originalStatus = doc.status;
});

module.exports = mongoose.model('Question', questionSchema);
