import {test,expect} from '@playwright/test';
test.beforeEach(async ({}, testInfo) => {
 if (testInfo.project.name === 'mobile-chromium') test.skip();
});
test('game setup, moves, undo, save, replay and theme work together',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Crystal Chess'})).toBeVisible();
 await page.getByRole('button',{name:/^New game/}).click();
 await page.getByLabel('Game mode').selectOption('local');
 await page.getByLabel('Play as').selectOption('black');
 await page.getByLabel('Time control').selectOption('3+2');
 await page.getByRole('button',{name:'Start game',exact:true}).click();
 await page.getByLabel('Move command').fill('e2 to e4');
 await page.getByRole('button',{name:'Play move',exact:true}).click();
 await expect(page.getByRole('button',{name:/Pawn to e4/})).toBeVisible();
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(page.getByRole('button',{name:/Pawn to e4/})).toHaveCount(0);
 await page.getByLabel('Move command').fill('d2 to d4');
 await page.getByRole('button',{name:'Play move',exact:true}).click();
 await expect(page.getByRole('button',{name:/Pawn to d4/})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('button',{name:/Pawn to d4/})).toBeVisible();
 await page.getByLabel('Board theme').selectOption('frost');
 await expect(page.locator('.chess-app')).toHaveAttribute('data-theme','frost');
 await page.getByRole('button',{name:/Pawn to d4/}).click();
 await expect(page.getByLabel('Replay position')).toBeVisible();
 await page.getByRole('button',{name:'Return to game'}).click();
 await page.getByRole('button',{name:'Resign',exact:true}).click();
 await page.getByRole('button',{name:'Confirm resignation'}).click();
 await expect(page.getByRole('heading',{name:'White wins'})).toBeVisible();
});
test('puzzle can be solved and reset',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/^Puzzles/}).click();
 await page.getByRole('button',{name:/Back-rank finale/}).click();
 await page.getByLabel('Move command').fill('e1 e8');await page.getByRole('button',{name:'Play move',exact:true}).click();
 await expect(page.getByText('Puzzle solved', {exact:true})).toBeVisible();
});
