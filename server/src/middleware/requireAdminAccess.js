const { timingSafeEqual } = require('crypto')
const { config } = require('../config')

function isAuthorized(providedKey, expectedKey) {
  const providedBuffer = Buffer.from(providedKey)
  const expectedBuffer = Buffer.from(expectedKey)

  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(providedBuffer, expectedBuffer)
}

function requireAdminAccess(req, res, next) {
  const expectedKey = config.adminAccessKey

  if (!expectedKey) {
    return res.status(503).json({
      message: 'Admin dashboard access key is not configured on the server.',
    })
  }

  const providedKey = req.header('x-admin-key')
  if (!providedKey || typeof providedKey !== 'string') {
    return res.status(401).json({
      message: 'Admin access is required.',
    })
  }

  if (!isAuthorized(providedKey, expectedKey)) {
    return res.status(403).json({
      message: 'Invalid admin access key.',
    })
  }

  return next()
}

module.exports = { requireAdminAccess }
