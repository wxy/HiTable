// Capture actual 0.2.2 demo interactions in an isolated Chrome profile.
// Full frames and profiles are disposable; trimmed footage is a production input.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const TMP = process.env.HITABLE_CAPTURE_TMP || fs.mkdtempSync(path.join(os.tmpdir(), 'hitable-promo-'));
const OUT = path.join(__dirname, 'public/captures');
const ZIP = process.env.HITABLE_PACKAGE || path.resolve(__dirname, '../../../../dist/hitable-0.2.2-store.zip');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
fs.mkdirSync(OUT, {recursive: true});
fs.mkdirSync(TMP, {recursive: true});
const extension = path.join(TMP, 'extension');
execFileSync('python3', ['-c', 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', ZIP, extension]);
const manifest = {source: crypto.createHash('sha256').update(fs.readFileSync(ZIP)).digest('hex'), viewport: {width: 1200, height: 700}, dpr: 2, clips: {}};
if((process.env.HITABLE_CAPTURE_LOCALES||process.env.HITABLE_CAPTURE_SHOT) && fs.existsSync(path.join(OUT,'layout.json'))) Object.assign(manifest,JSON.parse(fs.readFileSync(path.join(OUT,'layout.json'),'utf8')));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function record(page, name, duration, crop, act) {
  if(process.env.HITABLE_CAPTURE_SHOT && !name.endsWith('-'+process.env.HITABLE_CAPTURE_SHOT)) return await act();
  const dir = path.join(TMP, name); fs.mkdirSync(dir, {recursive:true});
  const frames = [];
  let running=true;
  const loop=(async()=>{
    while(running){
      const t=performance.now();
      const data=await page.screenshot({type:'jpeg',quality:97,scale:'device',clip:{x:crop.x,y:crop.y,width:crop.w,height:crop.h}});
      const file=path.join(dir,String(frames.length).padStart(6,'0')+'.jpg');
      fs.writeFileSync(file,data);
      frames.push({file,time:(t+performance.now())/2000});
      await sleep(Math.max(0,33-(performance.now()-t)));
    }
  })();
  while(!frames.length) await sleep(10);
  const start=performance.now();
  try {await act();await sleep(Math.max(0,duration*1000-(performance.now()-start)));}
  finally {running=false;await loop;}
  const actual=(performance.now()-start)/1000;
  const input = frames.map((f,i) => `file '${f.file}'\nduration ${i+1<frames.length ? frames[i+1].time-f.time : Math.max(.04, actual-(f.time-frames[0].time))}\n`).join('')+`file '${frames.at(-1).file}'\n`;
  fs.writeFileSync(path.join(dir,'frames.txt'),input);
  const size=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',frames[0].file],{encoding:'utf8'})).streams[0];
  const geometry=[size.width,size.height];
  execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',path.join(dir,'frames.txt'),'-vf','fps=30','-t',String(duration),'-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-an','-movflags','+faststart',path.join(OUT,name+(name==='en-menu'?'-compact':'')+'.mp4')],{stdio:'inherit'});
  manifest.clips[name]={duration,crop,pixels:{width:geometry[0],height:geometry[1]},actualFrames:frames.length};
  console.log('Captured '+name+': '+frames.length+' actual frames');
}

async function main(){
  const context=await chromium.launchPersistentContext(path.join(TMP,'profile'),{executablePath:chrome,headless:true,viewport:manifest.viewport,deviceScaleFactor:2,ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging']});
  try {
    const browser=context.browser(); manifest.browser=browser.version();
    const cdp=await browser.newBrowserCDPSession();
    const {id}=await cdp.send('Extensions.loadUnpacked',{path:extension});
    await context.grantPermissions(['clipboard-read','clipboard-write']);
    const page=await context.newPage(); page.setDefaultTimeout(10000);
    const move=async(x,y,ms=600)=>{const old=await page.evaluate(()=>window.__promoPointer||{x:10,y:10});for(let i=1;i<=20;i++){await page.mouse.move(old.x+(x-old.x)*i/20,old.y+(y-old.y)*i/20);await sleep(ms/20);}};
    const cell=async(r,c)=>{const b=await page.locator('#demo-financial tr').nth(r).locator('td').nth(c).boundingBox();return{x:b.x+b.width/2,y:b.y+b.height/2};};
    const select=async()=>{const a=await cell(1,2),b=await cell(3,4);await move(a.x,a.y,350);await page.mouse.down();await move(b.x,b.y,1200);await page.mouse.up();};
    for(const locale of (process.env.HITABLE_CAPTURE_LOCALES||'zh_CN,en').split(',')){
      await page.goto(`chrome-extension://${id}/pages/demo.html?locale=${locale}`);
      await page.evaluate(activeLocale=>chrome.storage.sync.set({HiTable:{activationMode:'manual',numberFormat:'auto',themeMode:'auto',boxColor:'#27ae60',algorithm:{top:'AVG',right:'SUM',bottom:'SUM',left:'AVG'},enabledAlgorithms:activeLocale==='en'?['SUM','AVG']:['SUM','AVG','MIN','MAX'],conditionalFormatting:{enabled:false}}}),locale);
      await page.reload();await sleep(700);
      await page.locator('#demoBgGreen').check();
      await page.locator('#demo-financial').evaluate(t=>scrollTo(0,t.getBoundingClientRect().top+scrollY-110));
      await page.evaluate(()=>{
        const el=document.createElement('div');el.id='editorial-pointer';el.style.cssText='position:fixed;left:0;top:0;width:18px;height:25px;z-index:2147483647;pointer-events:none';
        el.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 25"><path d="M1 1L1 20L6 15L10 24L14 22L10 14L17 14Z" fill="#14271d" stroke="white" stroke-width="1.4"/></svg>';
        document.documentElement.append(el);
        document.addEventListener('mousemove',e=>{window.__promoPointer={x:e.clientX,y:e.clientY};el.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;},true);
      });
      const wide={x:225,y:95,w:680,h:275};
      const tableGeometry=await page.locator('#demo-financial').boundingBox();
      manifest[locale]={table:tableGeometry};
      await page.screenshot({path:path.join(TMP,locale+'-page.png'),fullPage:true});
      await record(page,locale+'-select',6,wide,async()=>{await sleep(800);await select();await move(920,410,500);assert.equal(await page.locator('.HiTableDataCell').count(),9);});
      await page.screenshot({path:path.join(TMP,locale+'-selection.png')});
      const btn=await page.locator('.HiTableAlgorithmButton[data-direction="bottom"]').boundingBox();
      const narrow={x:Math.floor(btn.x-90),y:Math.floor(btn.y-12),w:330,h:260};
      await record(page,locale+'-menu',10,narrow,async()=>{await sleep(600);await move(btn.x+btn.width/2,btn.y+btn.height/2);await page.mouse.down();await page.mouse.up();await sleep(1600);const avg=page.locator('.HiTableMenu button[data-algorithm="AVG"]');const b=await avg.boundingBox();await move(b.x+b.width/2,b.y+b.height/2);await sleep(600);await page.mouse.down();await page.mouse.up();await move(920,410);assert.equal(await page.locator('.HiTableMenu').count(),0);});
      await record(page,locale+'-resize',10,wide,async()=>{await sleep(700);const h=await page.locator('.HiTableResizeHandle[data-corner="se"]').boundingBox();await move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();const b=await cell(2,3);await move(b.x,b.y,1600);await page.mouse.up();await sleep(1300);assert.equal(await page.locator('.HiTableDataCell').count(),4);const hh=await page.locator('.HiTableResizeHandle[data-corner="se"]').boundingBox();await move(hh.x+hh.width/2,hh.y+hh.height/2,350);await page.mouse.down();const a=await cell(3,4);await move(a.x,a.y,1200);await page.mouse.up();await move(920,410);assert.equal(await page.locator('.HiTableDataCell').count(),9);});
      await record(page,locale+'-copy',9,wide,async()=>{await sleep(700);await page.bringToFront();await page.keyboard.press('Meta+c');await page.locator('.HiTableToast').waitFor({state:'visible'});manifest[locale].copyToast=await page.locator('.HiTableToast').innerText();const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.deepEqual(copied.trim().split(/\s+/).map(Number),[12000,14000,13000,9800,11000,10000,22000,24000,23000]);manifest[locale].clipboardVerified=true;await sleep(2500);await page.keyboard.press('Meta+c');});
      for(const [colour,dark] of [['Blue',false],['Green',true]]){
        await page.keyboard.press('Escape');await page.locator('#demoBg'+colour).check();await page.locator('#demoDarkBackground').setChecked(dark);
        await page.locator('#demo-financial').evaluate(t=>scrollTo(0,t.getBoundingClientRect().top+scrollY-110));await select();await move(920,410);await sleep(400);
        const name=locale+'-'+(dark?'dark':'light');await page.screenshot({path:path.join(OUT,name+'.png'),clip:{x:wide.x,y:wide.y,width:wide.w,height:wide.h}});
      }
      console.log('Verified '+locale+' real selection, AVG menu, 3x3 → 2x2 → 3x3 resize, clipboard and theme captures');
    }
  } finally {await context.close();}
  fs.writeFileSync(path.join(OUT,'layout.json'),JSON.stringify(manifest,null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
