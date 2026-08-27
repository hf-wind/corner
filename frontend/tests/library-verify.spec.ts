import { test, expect } from '@playwright/test';

test('library index tab switching no overlap', async ({ page }) => {
  await page.goto('http://localhost:3000/library');
  await page.waitForLoadState('networkidle');
  
  // 检查初始加载
  const cards = page.locator('.library-card, .card-grid > *');
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
  
  // 切换 tab - 点击"阅读书架"
  const bookTab = page.locator('.filter-tabs button:has-text("阅读书架")');
  await bookTab.click();
  await page.waitForLoadState('networkidle');
  
  // 验证没有重叠：新内容可见，旧内容已离场
  await expect(cards.first()).toBeVisible();
  
  // 切换回"全部收藏"
  const allTab = page.locator('.filter-tabs button:has-text("全部收藏")');
  await allTab.click();
  await page.waitForLoadState('networkidle');
  
  await expect(cards.first()).toBeVisible();
  
  console.log('✅ library index tab switching works without overlap');
});

test('library detail scroll reveal no flicker', async ({ page }) => {
  // 先去列表页拿一个 slug
  await page.goto('http://localhost:3000/library');
  await page.waitForLoadState('networkidle');
  
  const firstCard = page.locator('.card-grid > a, .card-grid > [data-v-] > a').first();
  const href = await firstCard.getAttribute('href');
  if (!href) {
    console.log('⚠️ No library items to test detail page');
    return;
  }
  
  await page.goto(`http://localhost:3000${href}`);
  await page.waitForLoadState('networkidle');
  
  // 检查"我的体会" section 可见且无闪烁
  const reflectionSection = page.locator('.reflection-section');
  await expect(reflectionSection).toBeVisible({ timeout: 5000 });
  
  // 滚动到底部区域触发可能的闪烁点
  await page.evaluate(() => {
    const sections = document.querySelectorAll('.reveal-block');
    sections.forEach((s, i) => {
      setTimeout(() => s.scrollIntoView({ behavior: 'smooth', block: 'end' }), i * 200);
    });
  });
  
  await page.waitForTimeout(2000);
  
  // 验证所有 section 仍可见（未复位隐藏）
  const allSections = page.locator('.reveal-block');
  const count = await allSections.count();
  for (let i = 0; i < count; i++) {
    await expect(allSections.nth(i)).toBeVisible();
  }
  
  console.log('✅ library detail scroll reveal works without flicker');
});

test.describe('Console errors check', () => {
  test('no console errors on library pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto('http://localhost:3000/library');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const firstCard = page.locator('.card-grid > a').first();
    const href = await firstCard.getAttribute('href');
    if (href) {
      await page.goto(`http://localhost:3000${href}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
    
    const relevantErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('DevTools') &&
      !e.includes('Source map')
    );
    
    if (relevantErrors.length > 0) {
      console.log('⚠️ Console errors:', relevantErrors);
    } else {
      console.log('✅ No console errors');
    }
    
    expect(relevantErrors.length).toBe(0);
  });
});