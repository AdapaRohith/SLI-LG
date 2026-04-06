const mongoose = require('mongoose')
const { allowedBudgets } = require('../lib/leadBudgets')

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    budget: {
      type: String,
      required: true,
      enum: allowedBudgets,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    score: {
      type: String,
      required: true,
      enum: ['High', 'Medium', 'Low'],
    },
    source: {
      type: String,
      default: 'landing-page',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

module.exports = mongoose.models.Lead || mongoose.model('Lead', leadSchema)
