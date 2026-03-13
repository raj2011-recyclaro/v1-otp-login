const { z } = require('zod');
const { PICKUP_STATUS } = require('../services/pickup.service');

const pickupStatusValues = Object.values(PICKUP_STATUS);
const transportModeValues = ['self_drop', 'pickup'];

const inlineAddressSchema = z.object({
  label: z.enum(['home', 'work', 'other']).optional(),
  line1: z.string().trim().min(3).max(150),
  line2: z.string().trim().max(150).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().min(3).max(20),
  country: z.string().trim().min(2).max(80).optional()
});

const createPickupSchema = z
  .object({
    body: z
      .object({
        category: z.string().trim().min(2).max(80),
        weight: z.coerce.number().positive(),
        transportMode: z.enum(transportModeValues),
        addressId: z.string().uuid().optional(),
        address: inlineAddressSchema.optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        scheduledAt: z.string().datetime().optional(),
        notes: z.string().trim().max(500).optional()
      })
      .refine((data) => Boolean(data.addressId || data.address), {
        message: 'Either addressId or address is required'
      }),
    query: z.object({}).optional().default({}),
    params: z.object({}).optional().default({})
  });

const listPickupsSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({
    status: z.enum(pickupStatusValues).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10)
  }),
  params: z.object({}).optional().default({})
});

const pickupIdParamSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({
    id: z.string().uuid()
  })
});

const cancelPickupSchema = z.object({
  body: z.object({
    reason: z.string().trim().max(300).optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({
    id: z.string().uuid()
  })
});

const rebookPickupSchema = z.object({
  body: z.object({
    category: z.string().trim().min(2).max(80).optional(),
    weight: z.coerce.number().positive().optional(),
    transportMode: z.enum(transportModeValues).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    scheduledAt: z.string().datetime().optional(),
    notes: z.string().trim().max(500).optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({
    id: z.string().uuid()
  })
});

const ratePickupSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    review: z.string().trim().max(500).optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({
    id: z.string().uuid()
  })
});

module.exports = {
  createPickupSchema,
  listPickupsSchema,
  pickupIdParamSchema,
  cancelPickupSchema,
  rebookPickupSchema,
  ratePickupSchema
};
