const express = require('express')
const {
  createLeadHandler,
  exportLeadsHandler,
  listLeadsHandler,
} = require('../controllers/leadController')
const { requireAdminAccess } = require('../middleware/requireAdminAccess')

const router = express.Router()

router.post('/leads', createLeadHandler)
router.get('/leads', requireAdminAccess, listLeadsHandler)
router.get('/leads/export', requireAdminAccess, exportLeadsHandler)

module.exports = router
