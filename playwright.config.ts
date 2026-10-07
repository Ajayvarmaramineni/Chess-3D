import {defineConfig, devices} from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
  timeout: 45_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['line'], ['html', {open:'never'}]] : 'list',
  projects: [
    {name:'chromium', use:{...devices['Desktop Chrome'], launchOptions:{args:['--use-angle=swiftshader','--enable-webgl']}}},
    {name:'firefox', use:{...devices['Desktop Firefox']}},
    {name:'webkit', use:{...devices['Desktop Safari']}},
    {name:'mobile-chromium', use:{...devices['Pixel 7'], launchOptions:{args:['--use-angle=swiftshader','--enable-webgl']}}},
  ],
});
