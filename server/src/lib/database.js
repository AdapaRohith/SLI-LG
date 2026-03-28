const mongoose = require('mongoose')
const { config } = require('../config')

let storageMode = 'memory'

async function connectDatabase() {
  if (!config.mongoUri) {
    return { storageMode }
  }

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    })
    storageMode = 'mongo'
    return { storageMode }
  } catch (error) {
    console.warn('MongoDB connection failed. Falling back to in-memory storage.', error.message)
    storageMode = 'memory'
    return { storageMode }
  }
}

function getStorageMode() {
  return storageMode
}

function isMongoEnabled() {
  return mongoose.connection.readyState === 1
}

module.exports = {
  connectDatabase,
  getStorageMode,
  isMongoEnabled,
}
