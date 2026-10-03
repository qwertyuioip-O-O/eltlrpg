import {drawWarrior,drawBoss} from './art.js';
import {parsePost,type State,type Reply} from '../shared.js';
async function main(){
  const config=await chrome.storage.local.get(['postUrl','apiUrl']);
  if(typeof config.apiUrl!=='string' || typeof config.postUrl!=='string' || !parsePost(config.postUrl) || parsePost(location.href)?.key!==parsePost(config.postUrl)?.key) return;
  const article=document.querySelector('.writing_view_box, .write_div');
  if(!article || document.getElementById('dc-raid')) return;
  const host=document.createElement('section');host.id='dc-raid';article.after(host);const root=host.attachShadow({mode:'closed'});
  root.innerHTML=`<style>
  :host{display:block;margin:24px 0;font:14px system-ui;color:#e6edf6}*{box-sizing:border-box}.box{background:#111b29;border:1px solid #46566a;border-radius:14px;padding:20px}header{display:flex;justify-content:space-between;align-items:center}h2{font-size:22px;color:#eac389;margin:0}small{color:#99adc5}button,input{font:inherit;border-radius:7px;padding:9px 12px}button{background:#eac389;color:#182133;border:0;cursor:pointer}button:disabled{opacity:.4;cursor:default}input{background:#233246;color:white;border:1px solid #53647a}.grid{display:grid;grid-template-columns: minmax(0,2fr) minmax(220px,1fr);gap:18px;margin-top:16px}canvas{width:100%;background:#172236;border-radius:10px}.bar{height:10px;background:#364359;border-radius:8px;overflow:hidden;margin:10px 0}.fill{height:100%;background:#dc736c;transition:width .3s}.stats{line-height:1.9}.item{padding:10px 0;border-top:1px solid #354357}.item button{padding:5px 8px;margin:5px 4px 0 0}#notice{min-height:24px;color:#f2c77e;margin:12px 0;white-space:pre-wrap}#game[hidden],#join[hidden]{display:none}.scroll{max-height:270px;overflow:auto}ol{padding-left:24px}li{padding:4px}#rewards button{margin:4px} @media(max-width:750px){.grid{grid-template-columns:1fr}}
  </style><div class="box"><header><div><small>DAILY COMMUNITY RAID · KST 00:00</small><h2>게시글 원정대</h2></div><button id="toggle">접기</button></header><div id="game"><p id="notice" role="status">연결 중…</p><form id="join" hidden><input id="nick" maxlength="16" placeholder="원정대 닉네임" required><button>첫 입장</button></form><div class="grid"><div><div id="boss"></div><div class="bar"><div class="fill"></div></div><canvas width="720" height="340" aria-label="보스 전장"></canvas><p><button id="attack" disabled>공격</button> <button id="refresh">다시 연결</button></p><div id="contribution"></div><h3>오늘의 원정대</h3><ol id="leaders"></ol></div><aside><div class="stats" id="stats"></div><h3>장비 가방</h3><div class="scroll" id="items"></div><h3>참여 보상</h3><div id="rewards"></div></aside></div></div></div>`;
  const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  let state:State|undefined,busy=false,online=false,closed=false,inView=true,animation=0,hit=0,lastDamage=0,pending:any=null;
  const notice=(s:string)=>{q('#notice').textContent=s;};
  async function api(body:any):Promise<Reply & {status?:number}>{return chrome.runtime.sendMessage({kind:'api',body});}
  function controls(){root.querySelectorAll<HTMLButtonElement>('[data-item], [data-reward], #attack').forEach(b=>b.disabled=busy||!online);}
  const slotNames={weapon:'무기',armor:'갑옷',charm:'장신구'};
  function render(){if(!state)return;const s=state;
    q('#boss').textContent=`${s.day} · ${s.boss.name} — ${s.boss.hp.toLocaleString()} / ${s.boss.max_hp.toLocaleString()}`;
    q<HTMLElement>('.fill').style.width=`${s.boss.hp/s.boss.max_hp*100}%`;
    q('#stats').textContent=`${s.player.nickname} · Lv.${s.player.level}\n경험치 ${s.player.xp} · 공격력 ${s.player.attack}\n골드 ${s.player.gold} · 행동력 ${s.player.energy}/20`;
    q<HTMLElement>('#stats').style.whiteSpace='pre-line';
    q('#contribution').textContent=`내 공동 피해량 ${s.contribution.toLocaleString()} · 행동력 5분마다 회복`;
    q('#attack').textContent=s.boss.hp===0?'연습 전투':'보스 공격';
    q('#items').replaceChildren();
    for(const item of s.items){const div=document.createElement('div');div.className='item';const label=document.createElement('div');label.textContent=`${item.equipped?'◆ ':''}${slotNames[item.slot]} · ${item.name} +${item.upgrade} (공격 +${item.power+item.upgrade*2})`;div.append(label);
      for(const action of ['equip','upgrade']){const b=document.createElement('button');b.dataset.item=item.id;b.textContent=action==='equip'?'장착':item.upgrade>=20?'최대 강화':`강화 ${(item.upgrade+1)*50}G`;b.addEventListener('click',()=>mutate({action,itemId:item.id}));div.append(b);}q('#items').append(div);}
    q('#leaders').replaceChildren();for(const leader of s.leaders){const li=document.createElement('li');li.textContent=`${leader.nickname} — ${leader.damage.toLocaleString()}`;q('#leaders').append(li);}
    q('#rewards').replaceChildren();for(const reward of s.rewards){const b=document.createElement('button');b.dataset.reward=reward.day;b.textContent=`${reward.day} ${reward.cleared?'처치':'참여'} 보상`;b.addEventListener('click',()=>mutate({action:'claim',day:reward.day}));q('#rewards').append(b);}if(!s.rewards.length)q('#rewards').textContent='처치 또는 하루 종료 후 참여 장비를 받습니다.';controls();draw();
  }
  async function refresh(){if(busy)return;busy=true;controls();try{const r=await api({action:'state'});if(r.error){online=false;notice(r.error);q<HTMLFormElement>('#join').hidden=r.status!==401;}else{state=r.state;online=true;q<HTMLFormElement>('#join').hidden=true;notice('연결됨 · 자정에 새 보스가 등장합니다.');render();}}catch{online=false;notice('연결이 끊겼습니다. 다시 연결하세요.');}finally{busy=false;controls();}}
  async function mutate(body:any){if(busy||!online)return;busy=true;controls();pending={...body,requestId:crypto.randomUUID()};await sendPending();}
  async function sendPending(){try{const r=await api(pending);if(r.error){const uncertain=r.status===0||!r.status||r.status>=500;online=!uncertain&&r.status!==401;notice(r.error);if(!uncertain)pending=null;}else{pending=null;state=r.state;online=true;if(r.damage){lastDamage=r.damage;hit=performance.now();animate();}notice(r.stale?'날짜가 바뀌었습니다. 새 보스로 다시 공격하세요.':'행동이 반영되었습니다.');render();}}catch{online=false;notice('결과를 확인하지 못했습니다. 다시 연결하면 같은 요청을 재시도합니다.');}finally{busy=false;controls();}}
  q('#refresh').addEventListener('click',()=>{if(busy)return;if(pending){busy=true;sendPending();}else refresh();});
  q('#attack').addEventListener('click',()=>{if(state)mutate({action:'attack',day:state.day,mode:state.boss.hp===0?'practice':'raid'});});
  q('#join').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;try{const r=await api({action:'register',nickname:q<HTMLInputElement>('#nick').value});if(r.error)notice(r.error);else{busy=false;await refresh();}}finally{busy=false;}});
  q('#toggle').addEventListener('click',()=>{closed=!closed;q<HTMLElement>('#game').hidden=closed;q('#toggle').textContent=closed?'펼치기':'접기';if(closed)cancelAnimationFrame(animation);else{draw();refresh();}});
  const canvas=q<HTMLCanvasElement>('canvas'),ctx=canvas.getContext('2d')!;
  function draw(){const t=hit?(performance.now()-hit)/1000:10;const motion=t<1.2?Math.sin(Math.min(1,t/1.2)*Math.PI):0;const x=140+motion*300;
    ctx.clearRect(0,0,720,340);const gradient=ctx.createLinearGradient(0,0,0,340);gradient.addColorStop(0,'#101e36');gradient.addColorStop(1,'#34434c');ctx.fillStyle=gradient;ctx.fillRect(0,0,720,340);
    ctx.fillStyle='#d9d8be';ctx.beginPath();ctx.arc(610,58,24,0,7);ctx.fill();ctx.fillStyle='#1a2b2f';for(let i=0;i<10;i++){ctx.beginPath();ctx.moveTo(i*90-40,270);ctx.lineTo(i*90+15,90+i%3*25);ctx.lineTo(i*90+70,270);ctx.fill();}ctx.fillStyle='#405146';ctx.fillRect(0,270,720,70);
    const strike=t<1.2?Math.sin(t/1.2*Math.PI):0;drawWarrior(ctx,x,235,strike);
    const index=state?Math.floor(Date.parse(state.day+'T00:00:00Z')/86400000)%3:0;drawBoss(ctx,index,t>.45&&t<.85?Math.sin((t-.45)/.4*Math.PI):0);
    if(t<1.2){ctx.fillStyle='#ffcf7c';ctx.font='bold 32px system-ui';ctx.fillText(`-${lastDamage}`,520,140-t*35);}ctx.fillStyle='#e6edf6';ctx.font='16px system-ui';ctx.fillText(state?.boss.hp===0?'보스 처치 완료 · 개인 연습 가능':'원정대의 공격을 모아 보스를 처치하세요',22,320);
  }
  function animate(){cancelAnimationFrame(animation);const frame=()=>{if(closed||document.hidden)return;draw();if(performance.now()-hit<1200)animation=requestAnimationFrame(frame);};frame();}
  const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;});observer.observe(host);
  const interval=setInterval(()=>{if(!document.hidden&&!closed&&inView&&!pending)refresh();},30000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(animation);else if(!closed){draw();if(!pending)refresh();}});
  window.addEventListener('pagehide',()=>{clearInterval(interval);observer.disconnect();cancelAnimationFrame(animation);},{once:true});
  draw();await refresh();
}
main().catch(()=>console.warn('DC Raid could not initialize. Open extension settings.'));

