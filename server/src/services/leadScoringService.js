const OpenAI = require('openai')
const { config } = require('../config')

let openaiClient = null

function rulesBasedScore({ budget, preferredLocation }) {
  const hasLocation = Boolean(preferredLocation?.trim())

  if ((budget === '20-50L' || budget === '50L+') && hasLocation) {
    return 'High'
  }

  if (budget === '10-20L') {
    return 'Medium'
  }

  return 'Low'
}

async function scoreLead(lead) {
  const fallbackScore = rulesBasedScore(lead)

  if (!config.enableOpenAiScoring || !config.openAiApiKey) {
    return fallbackScore
  }

  try {
    if (!openaiClient) {
      openaiClient = new OpenAI({ apiKey: config.openAiApiKey })
    }

    const response = await openaiClient.responses.create({
      model: config.openAiModel,
      input: [
        {
          role: 'system',
          content:
            'Classify this real estate lead as High, Medium, or Low using the provided rubric only. Return one word.',
        },
        {
          role: 'user',
          content: `Budget: ${lead.budget}\nPreferred Location: ${lead.preferredLocation || 'Not specified'}\nRubric:\nHigh Intent: Budget > 20L + location specified\nMedium: Budget 10-20L\nLow: Budget < 10L`,
        },
      ],
    })

    const content = response.output_text?.trim()
    if (content === 'High' || content === 'Medium' || content === 'Low') {
      return content
    }

    return fallbackScore
  } catch (error) {
    console.warn('OpenAI scoring failed. Falling back to rules.', error.message)
    return fallbackScore
  }
}

module.exports = { scoreLead }
