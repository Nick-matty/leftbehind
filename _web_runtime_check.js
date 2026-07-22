const { chromium } = require('playwright-core');
(async () => {
  const browserPath = process.env.BROWSER_PATH;
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push({type: msg.type(), text: msg.text().slice(0,500)}));
  page.on('pageerror', err => logs.push({type: 'pageerror', text: String(err).slice(0,1000)}));
  page.on('response', async res => {
    if (res.url().includes('entry.bundle') || res.url().includes('index')) {
      logs.push({type:'response', text: `${res.status()} ${res.url().slice(0,120)}`});
    }
  });
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(8000);
  const rootText = await page.evaluate(() => {
    const root = document.getElementById('root') || document.getElementById('main');
    return {
      hasRoot: !!root,
      childCount: root ? root.childElementCount : 0,
      bodyText: (document.body && document.body.innerText || '').slice(0, 500),
      title: document.title,
    };
  });
  console.log(JSON.stringify({rootText, logs}, null, 2));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
