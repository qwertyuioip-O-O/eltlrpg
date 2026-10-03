import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {BOSSES} from '../src/shared.js';
const executable=process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe';
test('Chrome UI: shared updates, equipment, retry, collapsed/hidden polling and target filtering',{skip:!existsSync(executable)},async()=>{
 const browser=await chromium.launch({executablePath:executable,headless:true});
 const url='https://gall.dcinside.com/board/view/?id=test&no=1',code=await readFile('dist/extension/content.js','utf8');
 let hp=10000,offline=false,day='2026-10-03';const requests:any[]=[];
 const response=(action:any)=>({damage:action.action==='attack'?20:undefined,state:{day,boss:{name:BOSSES[Math.floor(Date.parse(day+'T00:00:00Z')/86400000)%3],hp,max_hp:10000},player:{nickname:'테스트 원정대',xp:12,gold:500,energy:19,level:1,attack:20,nextEnergyAt:null},items:[{id:'weapon-1',slot:'weapon',name:'낡은 검',power:5,upgrade:0,equipped:true}],contribution:10000-hp,leaders:[{nickname:'테스트 원정대',damage:10000-hp}],rewards:[],serverTime:Date.now()}});
 try{
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
  const pages=await Promise.all(contexts.map(async(context)=>{
   await context.route('https://gall.dcinside.com/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="ko"><body style="max-width:1000px;margin:30px auto"><h1>테스트 게시글</h1><div class="writing_view_box">원래 본문</div><div id="comments">원래 댓글</div></body></html>'}));
   const page=await context.newPage();page.on('pageerror',e=>console.error('Browser error:',e.message));page.on('console',m=>{if(m.type()==='warning')console.error(m.text());});
   await page.exposeFunction('mockApi',async(body:any)=>{requests.push(body);if(offline)return {error:'연결 실패',status:0};if(body.action==='attack')hp-=20;return response(body);});
   await page.addInitScript('window.__name = (fn) => fn;');
   await page.addInitScript(({url})=>{
    const w=window as any;Object.defineProperty(w,'chrome',{value:{storage:{local:{get:async()=>({postUrl:url,apiUrl:'https://raid.example'})}},runtime:{sendMessage:async(message:any)=>w.mockApi(message.body)}},configurable:true});
    const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(options){return attach.call(this,{...options,mode:'open'});};
   },{url});
   await page.goto(url);await page.addScriptTag({content:code});await page.locator('#attack').waitFor();await page.waitForFunction(()=>!(document.querySelector('#dc-raid')?.shadowRoot?.querySelector('#attack') as HTMLButtonElement)?.disabled);return page;
  }));
  const [a,b]=pages;await a.locator('#attack').click();await a.waitForFunction(()=>document.querySelector('#dc-raid')?.shadowRoot?.querySelector('#boss')?.textContent?.includes('9,980'));
  await b.locator('#refresh').click();await b.waitForFunction(()=>document.querySelector('#dc-raid')?.shadowRoot?.querySelector('#boss')?.textContent?.includes('9,980'));
  assert.equal(await a.locator('.writing_view_box').textContent(),'원래 본문');assert.equal(await a.locator('#comments').textContent(),'원래 댓글');
  await a.locator('[data-item]').last().click();await a.waitForFunction(()=>!(document.querySelector('#dc-raid')?.shadowRoot?.querySelector('#attack') as HTMLButtonElement)?.disabled);
  offline=true;await a.locator('#attack').click();await a.waitForFunction(()=>(document.querySelector('#dc-raid')?.shadowRoot?.querySelector('#attack') as HTMLButtonElement)?.disabled);
  const failed=requests.at(-1).requestId;offline=false;await a.locator('#refresh').click();await a.waitForFunction(()=>!(document.querySelector('#dc-raid')?.shadowRoot?.querySelector('#attack') as HTMLButtonElement)?.disabled);assert.equal(requests.at(-1).requestId,failed);
  await a.clock.install();await a.locator('#toggle').click();const before=requests.length;await a.clock.runFor(31000);assert.equal(requests.length,before);
  await a.locator('#toggle').click();await a.waitForFunction(()=>!(document.querySelector('#dc-raid')?.shadowRoot?.querySelector('#attack') as HTMLButtonElement)?.disabled);
  await a.evaluate(()=>Object.defineProperty(document,'hidden',{get:()=>true,configurable:true}));const beforeHidden=requests.length;await a.clock.runFor(31000);assert.equal(requests.length,beforeHidden);
  await a.evaluate(()=>Object.defineProperty(document,'hidden',{get:()=>false,configurable:true}));await mkdir('dist/qa',{recursive:true});await a.screenshot({path:'dist/qa/raid.png',fullPage:true});
  const previews:string[]=[];
  for(const date of ['2026-10-04','2026-10-05','2026-10-03']){
   day=date;await a.locator('#refresh').click();await a.waitForFunction(date=>document.querySelector('#dc-raid')?.shadowRoot?.querySelector('#boss')?.textContent?.includes(date),date);
   const image=await a.locator('canvas').screenshot();const name=BOSSES[Math.floor(Date.parse(date+'T00:00:00Z')/86400000)%3];previews.push(`<section><h2>${name}</h2><img src="data:image/png;base64,${image.toString('base64')}"></section>`);
  }
  const gallery=await contexts[0].newPage();await gallery.setViewportSize({width:1000,height:1650});await gallery.setContent(`<html lang="ko"><meta charset="utf-8"><style>body{background:#111b29;color:#eac389;font:16px system-ui;margin:32px}h1{font-size:25px}h2{font-size:18px}section{margin:22px 0}img{width:900px;border-radius:12px}</style><h1>게시글 원정대 · 캐릭터 & 보스</h1>${previews.join('')}</html>`);await gallery.screenshot({path:'dist/qa/bosses.png',fullPage:true});
  await b.goto(url.replace('no=1','no=2'));await b.addScriptTag({content:code});assert.equal(await b.locator('#dc-raid').count(),0);
 }finally{await browser.close();}
});

