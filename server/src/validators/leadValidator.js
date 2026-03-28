const { z } = require('zod')

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be exactly 10 digits.'),
  email: z
    .string()
    .trim()
    .email('Email must be valid.')
    .optional()
    .or(z.literal('')),
  budget: z.enum(['<10L', '10-20L', '20-50L', '50L+']),
  preferredLocation: z.string().trim().max(120, 'Location is too long.').optional().or(z.literal('')),
  source: z.string().trim().max(40).optional(),
})

function validateLead(payload) {
  return leadSchema.safeParse(payload)
}

module.exports = { validateLead }
