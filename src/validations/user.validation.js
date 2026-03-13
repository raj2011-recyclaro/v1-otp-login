const { z } = require('zod');

const addressLabels = ['home', 'work', 'other'];

const updateMyProfileSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(120),
    country: z.string().trim().min(2).max(80),
    userType: z.enum(['user', 'admin', 'driver']).optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

const createAddressSchema = z.object({
  body: z.object({
    label: z.enum(addressLabels).default('home'),
    line1: z.string().trim().min(3).max(150),
    line2: z.string().trim().max(150).optional(),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    pincode: z.string().trim().min(3).max(20),
    country: z.string().trim().min(2).max(80).default('India'),
    isDefault: z.boolean().default(false)
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

const addressIdParamSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({
    addressId: z.string().uuid()
  })
});

const updateAddressSchema = z
  .object({
    body: z
      .object({
        label: z.enum(addressLabels).optional(),
        line1: z.string().trim().min(3).max(150).optional(),
        line2: z.string().trim().max(150).nullable().optional(),
        city: z.string().trim().min(2).max(80).optional(),
        state: z.string().trim().min(2).max(80).optional(),
        pincode: z.string().trim().min(3).max(20).optional(),
        country: z.string().trim().min(2).max(80).optional(),
        isDefault: z.boolean().optional()
      })
      .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
      }),
    query: z.object({}).optional().default({}),
    params: z.object({
      addressId: z.string().uuid()
    })
  });

module.exports = {
  updateMyProfileSchema,
  createAddressSchema,
  addressIdParamSchema,
  updateAddressSchema
};
