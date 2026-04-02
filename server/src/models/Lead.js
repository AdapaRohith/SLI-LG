const mongoose = require('mongoose')

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
<<<<<<< HEAD
      enum: ['2cr', '5cr', '10cr+'],
=======
      enum: ['2-3Cr', '3-5Cr', '5Cr+'],
>>>>>>> 91f761f128e5ce96cefb3b2187c0abe90cd7fa46
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
