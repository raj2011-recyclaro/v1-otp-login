const { z } = require('zod');

const firebaseLoginSchema = z.object({
  body: z
    .object({
      idToken: z.string().min(10),
      userType: z.enum(['user', 'buyer', 'admin']).default('buyer'),
      adminCode: z.string().trim().min(3).optional()
    })
    .superRefine((data, ctx) => {
      if (data.userType === 'admin' && !data.adminCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['adminCode'],
          message: 'Admin code is required for admin login'
        });
      }
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
