const { randomUUID } = require('crypto')
const Lead = require('../models/Lead')
const { getStorageMode, isMongoEnabled } = require('../lib/database')

const memoryStore = []

function normalizeLead(document) {
  if (!document) {
    return null
  }

  const source = document.toObject ? document.toObject() : document
  return {
    id: String(source._id || source.id),
    name: source.name,
    phone: source.phone,
    email: source.email || '',
    budget: source.budget,
    location: source.location || '',
    score: source.score,
    source: source.source,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}

async function createLead(leadData) {
  if (isMongoEnabled()) {
    const lead = await Lead.create(leadData)
    return normalizeLead(lead)
  }

  const now = new Date().toISOString()
  const lead = {
    id: randomUUID(),
    ...leadData,
    createdAt: now,
    updatedAt: now,
  }

  memoryStore.unshift(lead)
  return normalizeLead(lead)
}

async function findDuplicateLead({ phone, preferredLocation }) {
  if (isMongoEnabled()) {
    return normalizeLead(
      await Lead.findOne({
        phone,
        location: preferredLocation || '',
      }).sort({ createdAt: -1 }),
    )
  }

  return (
    memoryStore.find(
      (lead) => lead.phone === phone && lead.location === (preferredLocation || ''),
    ) || null
  )
}

async function findLeads(filters = {}) {
  const { score, search, startDate, endDate } = filters

  if (isMongoEnabled()) {
    const query = {}

    if (score) {
      query.score = score
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        query.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        const inclusiveEndDate = new Date(endDate)
        inclusiveEndDate.setHours(23, 59, 59, 999)
        query.createdAt.$lte = inclusiveEndDate
      }
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 })
    return {
      leads: leads.map(normalizeLead),
      meta: {
        total: leads.length,
        storageMode: getStorageMode(),
      },
    }
  }

  const leads = memoryStore.filter((lead) => {
    if (score && lead.score !== score) {
      return false
    }

    if (search) {
      const term = search.toLowerCase()
      if (!lead.name.toLowerCase().includes(term) && !lead.phone.includes(term)) {
        return false
      }
    }

    if (startDate && new Date(lead.createdAt) < new Date(startDate)) {
      return false
    }

    if (endDate) {
      const inclusiveEndDate = new Date(endDate)
      inclusiveEndDate.setHours(23, 59, 59, 999)
      if (new Date(lead.createdAt) > inclusiveEndDate) {
        return false
      }
    }

    return true
  })

  return {
    leads: leads.map(normalizeLead),
    meta: {
      total: leads.length,
      storageMode: getStorageMode(),
    },
  }
}

module.exports = {
  createLead,
  findDuplicateLead,
  findLeads,
}
