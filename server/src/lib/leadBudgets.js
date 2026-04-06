const allowedBudgets = ['<10L', '10-20L', '20-50L', '50L+', '2cr', '5cr', '10cr+', '2-3Cr', '3-5Cr', '5Cr+']

const highIntentBudgets = new Set(['50L+', '10cr+', '3-5Cr', '5Cr+'])
const mediumIntentBudgets = new Set(['20-50L', '5cr', '2-3Cr'])

function getLeadScoreFromBudget({ budget, preferredLocation }) {
  const hasLocation = Boolean(preferredLocation?.trim())

  if (highIntentBudgets.has(budget) && hasLocation) {
    return 'High'
  }

  if (mediumIntentBudgets.has(budget)) {
    return 'Medium'
  }

  return 'Low'
}

function buildLeadScoringRubric() {
  return [
    'Classify the lead as High, Medium, or Low using these exact rules:',
    'High: Budget is 50L+, 10cr+, 3-5Cr, or 5Cr+ and a preferred location is provided.',
    'Medium: Budget is 20-50L, 5cr, or 2-3Cr.',
    'Low: Budget is <10L, 10-20L, 2cr, or anything else.',
    'Return exactly one word: High, Medium, or Low.',
  ].join('\n')
}

module.exports = {
  allowedBudgets,
  buildLeadScoringRubric,
  getLeadScoreFromBudget,
}
