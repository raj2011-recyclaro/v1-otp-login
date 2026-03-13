const { z } = require('zod');

const firebaseLoginSchema = z.object({
  body: z.object({
    idToken: z.string().min(10),
    userType: z.enum(['user', 'admin', 'driver']).optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20)
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

module.exports = {
  firebaseLoginSchema,
  refreshTokenSchema
};
