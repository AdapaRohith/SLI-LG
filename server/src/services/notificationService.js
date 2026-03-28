const nodemailer = require('nodemailer')
const { config } = require('../config')

let transporter = null

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

  if (config.ownerEmail) {
    const mailer = getTransporter()
    if (mailer) {
      tasks.push(
        mailer.sendMail({
          from: config.smtpUser,
          to: config.ownerEmail,
          subject: `New Real Estate Lead: ${lead.name}`,
          text: payload.message,
        }),
      )
    }
  }

  if (config.n8nWebhookUrl) {
    console.log('Sending to n8n:', config.n8nWebhookUrl)
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
        if (!response.ok) {
          const body = await response.text().catch(() => '')
          throw new Error(`n8n webhook failed with ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`)
        }

        return response
      }),
    )
  }

  return Promise.allSettled(tasks)
}

module.exports = {
  getLeadMessage,
  sendLeadNotifications,
}
