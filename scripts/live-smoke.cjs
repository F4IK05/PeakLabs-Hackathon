const {chromium}=require(process.argv[2]||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
  await page.goto('http://localhost:3000');
  const start=page.getByRole('button',{name:'СЕСТЬ ЗА СТОЛ'});
  await start.click();
  await page.waitForTimeout(1000);
  console.log('phase after start',await page.locator('.world').getAttribute('data-phase'));
  await page.screenshot({path:'artifacts/live-idle.png'});
  await page.getByRole('button',{name:'01 Камень'}).click({timeout:5000});
  await page.waitForTimeout(2000);
  console.log('phase after move',await page.locator('.world').getAttribute('data-phase'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
