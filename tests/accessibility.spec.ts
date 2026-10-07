import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('2D board supports keyboard play and has no serious accessibility violations',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'2D'}).click();
 const board=page.getByRole('grid',{name:/Interactive chess board/});
 await expect(board).toBeVisible();
 const focused=page.getByRole('gridcell',{name:/a1, white rook/});
 await focused.focus();
 await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('gridcell',{name:/b1, white knight/})).toBeFocused();
 await page.keyboard.press('ArrowRight');
 await page.keyboard.press('ArrowRight');
 await page.keyboard.press('ArrowRight');
 await page.keyboard.press('ArrowUp');
 await page.getByRole('gridcell',{name:/e2, white pawn/}).press('Enter');
 await expect(page.getByRole('gridcell',{name:/e4, empty, legal move/})).toBeVisible();
 const scan=await new AxeBuilder({page}).analyze();
 expect(scan.violations.filter(v=>['critical','serious'].includes(v.impact??''))).toEqual([]);
});

test('mobile layout keeps the game controls reachable and allows moves',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile-chromium','mobile-only journey');
 await page.goto('/');
 const toggle=page.getByRole('button',{name:/Game controls & moves/});
 await expect(toggle).toBeVisible();
 await toggle.click();
 await expect(page.getByRole('complementary',{name:'Game controls'})).toBeVisible();
 await toggle.click();
 await page.getByRole('button',{name:'2D'}).click();
 await expect(page.getByRole('grid')).toBeVisible();
 await page.getByRole('gridcell',{name:/e2, white pawn/}).click();
 await page.getByRole('gridcell',{name:/e4, empty, legal move/}).click();
 await expect(page.getByRole('gridcell',{name:/e4, white pawn/})).toBeVisible();
});
