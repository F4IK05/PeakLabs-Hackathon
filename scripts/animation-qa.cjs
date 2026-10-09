const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2] || 'playwright');
const baseURL=process.argv[3] || 'http://127.0.0.1:3101';
const root = path.resolve('out');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
async function stage(page, name) { await page.waitForFunction(stage => document.querySelector('canvas')?.dataset.animationStage === stage, name, { timeout: 12000 }); }
(async () => {
  await new Promise(resolve => server.listen(3101, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    fs.mkdirSync('artifacts/animation', { recursive: true });
    async function scenario(name, move, { water = false, fatal = false, edge = false, random = .99 } = {}) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(settings => {
        localStorage.setItem('shot-roulette-settings', JSON.stringify(settings));
      }, { maxSobriety: fatal ? 1 : 2, random, shotCount: edge ? 5 : water ? 2 : 1, alcoholCount: edge ? 5 : 1, recovery: 0, speed: 1, sound: false });
      await page.goto(baseURL);
      await page.waitForFunction(() => !document.querySelector('.asset-loading'));
      // Do not replace randomness used by React/Next during development hydration.
      await page.evaluate(random=>{Math.random=()=>random;},random);
      await page.getByRole('button', { name: 'СЕСТЬ ЗА СТОЛ' }).click();
      if (name.startsWith('opponent')) {
        const before = await page.locator('canvas').evaluate(c => c.toDataURL());
        let changed=false;
        for(let i=0;i<12&&!changed;i++) { await page.waitForTimeout(300);changed=await page.locator('canvas').evaluate(c => c.toDataURL())!==before; }
        assert.ok(changed, 'Opponent must move while idle');
        await page.screenshot({ path: 'artifacts/animation/idle.png' });
      }
      await page.evaluate(() => {
        window.armTrace=[];
        function trace() {
          const c=document.querySelector('canvas');
          if(c && ['reach','grasp','lift','sip','return','release','retract'].includes(c.dataset.animationStage)) {
            const x=Number(c.dataset.opponentX),y=Number(c.dataset.opponentFrame);
            if(Number.isFinite(x)&&Number.isFinite(y)) window.armTrace.push({x,y});
          }
          requestAnimationFrame(trace);
        }
        requestAnimationFrame(trace);
      });
      await page.getByRole('button', { name: move }).click();
      await page.waitForTimeout(1100);
      await page.screenshot({ path: `artifacts/animation/${name}-gesture.png` });
      if (!name.startsWith('opponent')) await page.getByRole('button', { name: `Шот ${water ? 2 : 1}, закрыт`, exact: true }).click();
      await stage(page, 'grasp');
      assert.equal(await page.getByRole('button', { name: '01 Камень' }).isEnabled(), false);
      await page.screenshot({ path: `artifacts/animation/${name}-grasp.png` });
      const torsoX = await page.locator('canvas').getAttribute('data-opponent-x');
      if (edge) assert.equal(await page.locator('canvas').getAttribute('data-opponent-hand'), random < .5 ? 'screen-left' : 'screen-right');
      await stage(page, 'lift');
      await page.screenshot({ path: `artifacts/animation/${name}-lift.png` });
      await stage(page, 'sip');
      if (edge) assert.ok(Math.abs(Number(await page.locator('canvas').getAttribute('data-opponent-x'))-Number(torsoX)) <= 3, 'Torso must stay seated');
      await page.waitForTimeout(200);
      await page.screenshot({ path: `artifacts/animation/${name}-sip.png` });
      await stage(page, 'release');
      await page.screenshot({ path: `artifacts/animation/${name}-return.png` });
      await stage(page, fatal ? 'gameOver' : 'reveal');
      assert.equal(await page.locator('.finish-layer').count(), 0, 'Final overlay must wait for reveal');
      await page.waitForTimeout(700);
      await page.screenshot({ path: `artifacts/animation/${name}-reveal.png` });
      if (edge) {
        const trace=await page.evaluate(()=>window.armTrace);
        assert.ok(trace.length>50,'Must inspect the entire arm animation');
        for(let i=1;i<trace.length;i++) assert.ok(trace[i].x===trace[i-1].x && trace[i].y>=trace[i-1].y,'Painted cels must advance with the torso fixed');
      }
      const subject = name.startsWith('opponent') ? 'оппонента' : 'игрока';
      const value = water ? 2 : fatal ? 0 : 1;
      assert.equal(await page.getByLabel(`Трезвость ${subject}: ${value} из ${fatal ? 1 : 2}`).count(), 1);
      if (fatal) await page.getByRole('button', { name: 'ЕЩЁ ОДНА ПАРТИЯ' }).waitFor();
      await page.close();
    }
    await scenario('opponent', '02 Ножницы');
    await scenario('opponent-left', '03 Бумага', {edge:true,random:.01});
    await scenario('opponent-right', '02 Ножницы', {edge:true});
    await scenario('player', '01 Камень');
    await scenario('water', '01 Камень', { water: true });
    await scenario('fatal', '01 Камень', { fatal: true });
    assert.deepEqual(errors, []);
    console.log('Animation QA passed: idle motion; player/opponent grab, sip and return; water/alcohol reveal; fatal reveal precedes final overlay.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());

