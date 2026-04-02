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
<<<<<<< HEAD
  budget: z.enum(['2cr', '5cr', '10cr+']),
=======
  budget: z.enum(['2-3Cr', '3-5Cr', '5Cr+']),
>>>>>>> 91f761f128e5ce96cefb3b2187c0abe90cd7fa46
  preferredLocation: z.string().trim().max(120, 'Location is too long.').optional().or(z.literal('')),
  source: z.string().trim().max(40).optional(),
})

function validateLead(payload) {
  return leadSchema.safeParse(payload)
}

module.exports = { validateLead }
