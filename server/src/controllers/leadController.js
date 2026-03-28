const { Parser } = require('json2csv')
const { createLead, findDuplicateLead, findLeads } = require('../services/leadRepository')
const { scoreLead } = require('../services/leadScoringService')
const { sendLeadNotifications } = require('../services/notificationService')
const { validateLead } = require('../validators/leadValidator')

async function createLeadHandler(req, res, next) {
  try {
    const parsed = validateLead(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || 'Invalid lead details.',
      })
    }

    const leadInput = parsed.data
    const duplicateLead = await findDuplicateLead(leadInput)

    if (duplicateLead) {
      return res.status(409).json({
        message: 'A lead with this phone number and location already exists.',
        lead: duplicateLead,
      })
    }

    const score = await scoreLead(leadInput)
    const lead = await createLead({
      name: leadInput.name.trim(),
      phone: leadInput.phone.trim(),
      email: leadInput.email?.trim() || '',
      budget: leadInput.budget,
      location: leadInput.preferredLocation?.trim() || '',
      score,
      source: leadInput.source || 'landing-page',
    })

    await sendLeadNotifications(lead)

    return res.status(201).json({
      message: 'Thank you! Our agent will contact you shortly.',
      lead,
    })
  } catch (error) {
    return next(error)
  }
}

async function listLeadsHandler(req, res, next) {
  try {
    const data = await findLeads(req.query)
    return res.json(data)
  } catch (error) {
    return next(error)
  }
}

async function exportLeadsHandler(req, res, next) {
  try {
    const data = await findLeads(req.query)
    const parser = new Parser({
      fields: ['name', 'phone', 'email', 'budget', 'location', 'score', 'createdAt'],
    })
    const csv = parser.parse(data.leads)
    res.header('Content-Type', 'text/csv')
    res.attachment('leads.csv')
    return res.send(csv)
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  createLeadHandler,
  listLeadsHandler,
  exportLeadsHandler,
}
