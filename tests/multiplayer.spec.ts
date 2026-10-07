import { expect, test } from '@playwright/test';

test('two browsers can join a private room and receive an animated move', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'one cross-browser multiplayer journey is sufficient');
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const useAccessibleBoard = () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2') return null;
      return original.call(this, type, ...args as []) as never;
    } as typeof original;
  };
  await Promise.all([
    hostContext.addInitScript(useAccessibleBoard),
    guestContext.addInitScript(useAccessibleBoard),
  ]);
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await host.goto('/');
  await host.getByRole('button', { name: 'Play a friend' }).click();
  await host.getByRole('button', { name: 'Create invitation' }).click();
  const invite = await host.getByLabel('Invitation link').inputValue();
  expect(invite).toContain('#room=');
  await guest.goto(invite);
  await host.getByRole('button', { name: 'Close dialog' }).click();
  await expect(host.getByText('Friend connected')).toBeVisible({ timeout: 15_000 });
  await expect(guest.getByText('Friend connected')).toBeVisible({ timeout: 15_000 });

  await host.getByLabel('Move command').fill('e2 to e4');
  await host.getByRole('button', { name: 'Play move', exact: true }).click();
  await expect(host.getByRole('button', { name: /Pawn to e4/ })).toBeVisible();
  await expect(guest.getByRole('button', { name: /Pawn to e4/ })).toBeVisible();

  await Promise.all([hostContext.close(), guestContext.close()]);
});
