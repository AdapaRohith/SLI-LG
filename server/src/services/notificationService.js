const nodemailer = require('nodemailer')
const { config } = require('../config')

let transporter = null

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null)
  }

  const text = await response.text().catch(() => '')
  return text || null
}

function getLeadMessage(lead) {
  return [
    'New Lead',
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    `Budget: ${lead.budget}`,
    `Location: ${lead.location || 'Not specified'}`,
    `Intent: ${lead.score}`,
  ].join('\n')
}

function getTransporter() {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    return null
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    })
  }

  return transporter
}

async function sendLeadNotifications(lead) {
  const payload = {
    lead,
    message: getLeadMessage(lead),
    channelHint: 'whatsapp-or-n8n',
  }

  const tasks = []
  const results = {
    email: {
      attempted: false,
      success: false,
    },
    webhook: {
      attempted: false,
      success: false,
      url: config.n8nWebhookUrl || null,
    },
  }

  if (config.ownerEmail) {
    const mailer = getTransporter()
    if (mailer) {
      results.email.attempted = true
      tasks.push(
        mailer.sendMail({
          from: config.smtpUser,
          to: config.ownerEmail,
          subject: `New Real Estate Lead: ${lead.name}`,
          text: payload.message,
        }).then(() => {
          results.email.success = true
        }),
      )
    }
  }

  if (config.n8nWebhookUrl) {
    results.webhook.attempted = true
    tasks.push(
      fetch(config.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          budget: lead.budget,
          location: lead.location,
          score: lead.score,
          source: lead.source,
          createdAt: lead.createdAt || new Date().toISOString(),
          lead,
          message: payload.message,
        }),
      }).then(async (response) => {
        const body = await parseResponseBody(response)
        results.webhook.status = response.status
        results.webhook.statusText = response.statusText
        results.webhook.data = body

        if (!response.ok) {
          const detail =
            typeof body === 'string' ? body : body?.message || JSON.stringify(body || {})
          throw new Error(
            `n8n webhook failed with ${response.status} ${response.statusText}${detail ? `: ${detail}` : ''}`,
          )
        }

        results.webhook.success = true
        return body
      }).catch((error) => {
        results.webhook.error = error.message
        return null
      }),
    )
  }

  await Promise.allSettled(tasks)
  return results
}

module.exports = {
  getLeadMessage,
  sendLeadNotifications,
}
