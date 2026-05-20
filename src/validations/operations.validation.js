const { z } = require('zod');
const { PICKUP_STATUS } = require('../services/pickup.service');

const adminManagedStatuses = [
  PICKUP_STATUS.ADMIN_IN_PROGRESS,
  PICKUP_STATUS.PICKUP_COMPLETED,
  PICKUP_STATUS.PAYMENT_CREDITED,
  PICKUP_STATUS.CANCELLED
];

const operationsPickupIdParams = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({
    id: z.string().uuid()
  })
});

const listOperationsPickupsSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({
    status: z.enum(Object.values(PICKUP_STATUS)).optional(),
    city: z.string().trim().min(2).max(80).optional(),
    scope: z.enum(['available', 'accepted', 'all']).default('available'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10)
  }),
  params: z.object({}).optional().default({})
});

const skipPickupSchema = z.object({
  body: z.object({
    reason: z.string().trim().max(300).optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({
    id: z.string().uuid()
  })
});

const adminTakeoverSchema = z.object({
  body: z.object({
    note: z.string().trim().max(300).optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({
    id: z.string().uuid()
  })
});

const updateOperationsStatusSchema = z.object({
  body: z.object({
    status: z.enum(adminManagedStatuses),
    note: z.string().trim().max(300).optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({
    id: z.string().uuid()
  })
});

const listBuyersSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({
    city: z.string().trim().min(2).max(80).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10)
  }),
  params: z.object({}).optional().default({})
});

module.exports = {
  operationsPickupIdParams,
  listOperationsPickupsSchema,
  skipPickupSchema,
  adminTakeoverSchema,
  updateOperationsStatusSchema,
  listBuyersSchema
};
