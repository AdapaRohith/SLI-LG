const express = require('express')
const {
  createLeadHandler,
  exportLeadsHandler,
  listLeadsHandler,
} = require('../controllers/leadController')

const router = express.Router()

router.post('/leads', createLeadHandler)
router.get('/leads', listLeadsHandler)
router.get('/leads/export', exportLeadsHandler)

module.exports = router
