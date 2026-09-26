import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: existsSync(localChrome) ? { executablePath: localChrome } : {},
  },
  webServer: {
    command: 'node server/index.mjs',
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      PORT: '3100',
      DATABASE_PATH: ':memory:',
      NODE_ENV: 'test',
      APP_URL: 'http://127.0.0.1:3100',
      VERCEL: '',
      TURSO_DATABASE_URL: '',
      TURSO_AUTH_TOKEN: '',
    },
  },
});
