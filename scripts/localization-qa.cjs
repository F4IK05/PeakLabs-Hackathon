const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2] || 'playwright');
const root = path.resolve('out');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
async function checkLayout(page, label) {
  const problems = await page.evaluate(() => {
    const problems = [];
    const visible = el => { const r=el.getBoundingClientRect();return r.width>1&&r.height>1&&getComputedStyle(el).visibility!=='hidden'; };
    for (const el of document.querySelectorAll('.button-content, .setting-row, .settings-links, .turn-message, .table-count, .language-control, .sobriety, .finish-menu, .launch-menu')) {
      if (!visible(el)) continue;
      if (el.scrollWidth > el.clientWidth + 2) problems.push(`overflow: ${el.className} (${el.scrollWidth}/${el.clientWidth})`);
    }
    const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node=walker.currentNode, el=node.parentElement;
      if(!node.textContent.trim() || !visible(el) || el.closest('select')) continue;
      const panel=el.closest('button, .setting-row, .sobriety, .launch-menu, .finish-menu, .turn-controls');
      if(!panel) continue;
      const bounds=panel.getBoundingClientRect(), range=document.createRange();range.selectNodeContents(node);
      for(const rect of range.getClientRects()) {
        if(rect.left<bounds.left-2||rect.right>bounds.right+2) problems.push(`text outside panel: ${node.textContent}`);
        if(rect.left< -2||rect.right>innerWidth+2) problems.push(`text outside screen: ${node.textContent}`);
        if(panel.tagName==='BUTTON'&&(rect.top<bounds.top-2||rect.bottom>bounds.bottom+2)) problems.push(`text outside button: ${node.textContent}`);
      }
    }
    const boxes=[...document.querySelectorAll('.control-bar button, .language-control select')].filter(visible).map(el=>({name:el.textContent,r:el.getBoundingClientRect()}));
    for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) {
      const a=boxes[i],b=boxes[j];
      if(Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>2 && Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>2) problems.push(`controls overlap: ${a.name}/${b.name}`);
    }
    const hud=[...document.querySelectorAll('.hud>section,.round-counter')].map(el=>el.getBoundingClientRect());
    for(let i=0;i<hud.length;i++) for(let j=i+1;j<hud.length;j++) if(Math.min(hud[i].right,hud[j].right)-Math.max(hud[i].left,hud[j].left)>2) problems.push('HUD overlap');
    return problems;
  });
  assert.deepEqual(problems, [], label);
}
(async () => {
  await new Promise(resolve => server.listen(3102,'127.0.0.1',resolve));
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  const errors=[];
  fs.mkdirSync('artifacts/localization',{recursive:true});
  try {
    const fresh=await browser.newPage();
    await fresh.goto('http://127.0.0.1:3102');
    await fresh.locator('.menu-buttons button').first().waitFor();
    assert.equal(await fresh.locator('html').getAttribute('lang'),'en');
    assert.equal(await fresh.title(),'Friday Evening');
    assert.equal(await fresh.locator('.language-control').count(),0);
    await fresh.locator('.menu-buttons button').last().click();
    await fresh.locator('.language-control select').selectOption('az');
    await fresh.reload();
    await fresh.waitForFunction(()=>document.documentElement.lang==='az');
    await fresh.close();
    for(const locale of ['en','az','ru']) for(const [width,height] of [[320,568],[375,812],[768,1024],[1440,900],[568,320],[320,320]]) {
      const page=await browser.newPage({viewport:{width,height}});
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(locale=>{
        localStorage.setItem('shot-roulette-language',locale);
        localStorage.setItem('shot-roulette-settings',JSON.stringify({maxSobriety:12,shotCount:12,alcoholCount:12,recovery:12,speed:2,sound:false}));
      },locale);
      await page.goto('http://127.0.0.1:3102');
      await page.waitForFunction(locale=>document.documentElement.lang===locale&&!document.querySelector('.asset-loading'),locale);
      await checkLayout(page,`${locale}/${width} menu`);
      await page.locator('.menu-buttons button').last().click();
      await checkLayout(page,`${locale}/${width} settings`);
      await page.locator('.settings-menu .language-control select').selectOption(locale==='en'?'az':'en');
      await checkLayout(page,`${locale}/${width} switched settings`);
      await page.locator('.settings-menu .language-control select').selectOption(locale);
      if(width===320&&height===568) await page.screenshot({path:`artifacts/localization/${locale}-settings.png`});
      await page.locator('.settings-menu>.sprite-button').click();
      await checkLayout(page,`${locale}/${width} game`);
      if(width===320&&height===568) await page.screenshot({path:`artifacts/localization/${locale}-game.png`});
      // The language selector belongs exclusively to the settings panel.
      assert.equal(await page.locator('.language-control').count(),0);
      assert.equal(await page.locator('.world').getAttribute('data-phase'),'choose');
      await page.close();
    }
    for(const locale of ['en','az','ru']) for(const [width,height] of [[320,568],[568,320]]) for(const victory of [false,true]) {
      const page=await browser.newPage({viewport:{width,height}});
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(locale=>{
        localStorage.setItem('shot-roulette-language',locale);
        localStorage.setItem('shot-roulette-settings',JSON.stringify({maxSobriety:1,shotCount:1,alcoholCount:1,recovery:0,speed:2,sound:false}));
      },locale);
      await page.goto('http://127.0.0.1:3102');
      await page.waitForFunction(()=>!document.querySelector('.asset-loading'));
      await page.locator('.menu-buttons button').first().click();
      await page.evaluate(()=>{Math.random=()=>.99;});
      await page.locator('.choices button').nth(victory?1:0).click();
      if(!victory) await page.locator('.shot-target').first().click();
      await page.locator('.finish-menu').waitFor({timeout:15000});
      await checkLayout(page,`${locale}/${width} finish ${victory}`);
      if(width===320) await page.screenshot({path:`artifacts/localization/${locale}-${victory?'win':'lose'}.png`});
      await page.close();
    }
    assert.deepEqual(errors,[]);
    console.log('Localization QA passed: English default; language persistence; 3 languages at 6 viewport sizes; settings, game, victory and defeat; no text overflow or control overlap.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
