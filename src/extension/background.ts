import { parsePost } from '../shared.js';
chrome.action.onClicked.addListener(()=>chrome.runtime.openOptionsPage());
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message?.kind!=='api' || sender.id!==chrome.runtime.id) return;
  (async()=>{
    const {apiUrl,postUrl,token}=await chrome.storage.local.get(['apiUrl','postUrl','token']);
    const configured=parsePost(typeof postUrl==='string'?postUrl:'');
    if(!sender.tab?.url || !configured || parsePost(sender.tab.url)?.key!==configured.key) throw new Error('지정된 게시글에서만 사용할 수 있습니다.');
    if(typeof apiUrl!=='string') throw new Error('API 주소를 설정하세요.');
    const u=new URL(apiUrl); if(u.protocol!=='https:' && !(u.protocol==='http:' && u.hostname==='localhost')) throw new Error('API 주소를 확인하세요.');
    const action=message.body?.action;
    if(!['register','state','attack','claim','equip','upgrade'].includes(action)) throw new Error('잘못된 요청입니다.');
    const payload={...message.body,post:configured.url};
    const response=await fetch(new URL('/api/game',u),{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
    const data=await response.json();
    if(!response.ok) { respond({error:data.error??'서버 오류',status:response.status}); return; }
    if(action==='register' && data.token) { await chrome.storage.local.set({token:data.token}); delete data.token; }
    respond(data);
  })().catch(e=>respond({error:e instanceof Error?e.message:'연결 실패',status:0}));
  return true;
});
