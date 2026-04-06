const cors = require('cors')
const express = require('express')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const morgan = require('morgan')
const { config } = require('./config')
const { getStorageMode } = require('./lib/database')
const leadRoutes = require('./routes/leadRoutes')
const webhookRoutes = require('./routes/webhookRoutes')

const app = express()

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many requests from this IP. Please try again later.',
  },
})

app.use(
  cors({
    origin: config.clientOrigin,
  }),
)
app.use(helmet())
app.use(express.json())
app.use(morgan('dev'))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    storageMode: getStorageMode(),
    adminAccessConfigured: Boolean(config.adminAccessKey),
  })
})

app.use('/api', writeLimiter, leadRoutes)
app.use('/webhook', writeLimiter, webhookRoutes)

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({
    message: 'Unexpected server error.',
  })
})

module.exports = { app }
