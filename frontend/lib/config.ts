// Environment configuration
export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  ENV: process.env.NEXT_PUBLIC_ENV || 'development',
  USE_MOCK_DATA: process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true',
};
