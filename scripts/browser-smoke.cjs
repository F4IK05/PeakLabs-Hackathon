// Usage: node scripts/browser-smoke.cjs <path-to-playwright-module>
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2] || 'playwright');
const root = path.resolve('out');
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(3100, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3100');
    await page.getByRole('button', { name: 'СЕСТЬ ЗА СТОЛ' }).waitFor();
    fs.mkdirSync('artifacts', { recursive: true });
    await page.screenshot({ path: 'artifacts/menu.png', fullPage: true });
    await page.getByRole('button', { name: 'СЕСТЬ ЗА СТОЛ' }).click();
    await page.waitForTimeout(300);
    const canvasBounds = await page.locator('canvas').boundingBox();
    assert.equal(canvasBounds.width, 1440); assert.equal(canvasBounds.height, 1080);
    assert.equal(await page.getByText('ЖУРНАЛ НОЧИ').count(), 0);
    assert.equal(await page.locator('.asset-loading').count(), 0);
    await page.screenshot({ path: 'artifacts/table.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/mobile-game.png', fullPage: true });
    const mobileBounds = await page.locator('canvas').boundingBox();
    assert.equal(mobileBounds.width, 390); assert.equal(mobileBounds.height, 844);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile game horizontal overflow');
    await page.getByRole('button', { name: 'В меню', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.getByRole('button', { name: 'Настройки', exact: true }).click();
    for (let i = 0; i < 5; i++) await page.getByLabel('Уменьшить: Очки трезвости').click();
    for (let i = 0; i < 4; i++) await page.getByLabel('Уменьшить: Шотов на столе').click();
    await page.getByRole('combobox').selectOption('2');
    await page.getByRole('button', { name: 'СЕСТЬ ЗА СТОЛ' }).click();
    await page.screenshot({ path: 'artifacts/game.png', fullPage: true });
    // A one-point, one-alcohol-shot match ends on the first decisive RPS turn.
    for (let i = 0; i < 20; i++) {
      if (await page.getByRole('button', { name: 'ЕЩЁ ОДНА ПАРТИЯ' }).count()) break;
      const rock = page.getByRole('button', { name: '01 Камень' });
      if (await rock.isEnabled()) await rock.click();
      if (i === 0) { await page.waitForTimeout(290); await page.screenshot({ path: 'artifacts/hands.png', fullPage: true }); }
      await page.waitForTimeout(650);
      const shot = page.getByRole('button', { name: 'Шот 1, закрыт', exact: true });
      if (await shot.count() && await shot.isEnabled()) await shot.click();
      await page.waitForTimeout(650);
    }
    await page.getByRole('button', { name: 'ЕЩЁ ОДНА ПАРТИЯ' }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Вернуться в меню' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Настройки', exact: true }).click();
    assert.equal(await page.locator('output').first().innerText(), '1');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile horizontal overflow');
    assert.deepEqual(errors, []);
    console.log('Browser smoke passed: menu, settings, complete match, return, persistence, mobile, no page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
