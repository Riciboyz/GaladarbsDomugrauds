module.exports = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  DATABASE_PATH: process.env.DATABASE_PATH || '../threads_app.db',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@domugrauds.com',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  TWO_FA_EMAIL_ENABLED: process.env.TWO_FA_EMAIL_ENABLED || 'false',
  TWO_FA_EMAIL_TTL_SECONDS: process.env.TWO_FA_EMAIL_TTL_SECONDS || '600',
  TWO_FA_DEV_SHOW_CODE: process.env.TWO_FA_DEV_SHOW_CODE || 'false'
};
