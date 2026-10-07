import { expect, test } from '@playwright/test';

test.beforeEach(async ({}, testInfo) => {
  if (testInfo.project.name === 'mobile-chromium') test.skip();
});

test('voice mode keeps listening and plays a spoken move without board input', async ({ page }) => {
  await page.addInitScript(() => {
    let delivered = false;
    class FakeSpeechRecognition {
      continuous = true;
      interimResults = true;
      lang = 'en-US';
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      start() {
        this.onstart?.();
        if (!delivered) {
          delivered = true;
          setTimeout(() => this.onresult?.({
            resultIndex: 0,
            results: Object.assign([[{ transcript: 'pawn to e four' }]], { 0: Object.assign([{ transcript: 'pawn to e four' }], { isFinal: true }) }),
          }), 20);
        }
      }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    Object.assign(window, { SpeechRecognition: FakeSpeechRecognition });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /^New game/ }).click();
  await page.getByLabel('Game mode').selectOption('local');
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await page.getByRole('button', { name: 'Enable voice mode' }).click();

  await expect(page.getByText('Listening for a move…')).toBeVisible();
  await expect(page.getByRole('button', { name: /Pawn to e4/ })).toBeVisible();
  await expect(page.getByText(/Heard: “pawn to e four”/)).toBeVisible();
});

test('voice mode keeps microphone permission errors visible', async ({ page }) => {
  await page.addInitScript(() => {
    class DeniedSpeechRecognition {
      continuous = true; interimResults = true; lang = 'en-US';
      onstart: (() => void) | null = null; onend: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null; onerror: ((event: {error:string}) => void) | null = null;
      start() { this.onstart?.(); setTimeout(() => this.onerror?.({error:'not-allowed'}), 10); }
      stop() { this.onend?.(); } abort() { this.onend?.(); }
    }
    Object.assign(window, { SpeechRecognition: DeniedSpeechRecognition });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enable voice mode' }).click();
  await expect(page.getByText(/Microphone permission was denied/)).toBeVisible();
});
