const path = require('path')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  ownerEmail: process.env.OWNER_EMAIL || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  ownerWebhookUrl: process.env.OWNER_WEBHOOK_URL || '',
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || process.env.OWNER_WEBHOOK_URL || '',
  enableOpenAiScoring: process.env.ENABLE_OPENAI_SCORING === 'true',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  adminAccessKey: process.env.ADMIN_ACCESS_KEY || '',
}

module.exports = { config }
