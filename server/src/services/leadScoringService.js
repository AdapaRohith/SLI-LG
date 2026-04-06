const OpenAI = require('openai')
const { config } = require('../config')
const { buildLeadScoringRubric, getLeadScoreFromBudget } = require('../lib/leadBudgets')

let openaiClient = null

function rulesBasedScore({ budget, preferredLocation }) {
  return getLeadScoreFromBudget({ budget, preferredLocation })
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
          content: buildLeadScoringRubric(),
        },
        {
          role: 'user',
          content: `Budget: ${lead.budget}\nPreferred Location: ${lead.preferredLocation || 'Not specified'}`,
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
