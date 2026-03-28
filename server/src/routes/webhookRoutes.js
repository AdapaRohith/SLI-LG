const express = require('express')
const { createLeadHandler } = require('../controllers/leadController')

const router = express.Router()

router.post('/lead', (req, res, next) => {
  req.body = {
    ...req.body,
    source: req.body.source || 'n8n-webhook',
  }

  return createLeadHandler(req, res, next)
})

module.exports = router
