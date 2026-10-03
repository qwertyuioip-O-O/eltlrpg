import {parsePost} from '../shared.js';
const api=document.querySelector<HTMLInputElement>('#api')!,post=document.querySelector<HTMLInputElement>('#post')!,notice=document.querySelector<HTMLElement>('#notice')!;
chrome.storage.local.get(['apiUrl','postUrl']).then(s=>{api.value=typeof s.apiUrl==='string'?s.apiUrl:'';post.value=typeof s.postUrl==='string'?s.postUrl:'';});
document.querySelector('form')!.addEventListener('submit',async e=>{
  e.preventDefault();
  try {
    const u=new URL(api.value.trim()); const p=parsePost(post.value.trim());
    if(!p) throw new Error('PC 디시 게시글 URL을 입력하세요.');
    if(u.protocol!=='https:' && !(u.protocol==='http:'&&u.hostname==='localhost')) throw new Error('HTTPS 또는 localhost 주소를 입력하세요.');
    const granted=await chrome.permissions.request({origins:[`${u.origin}/*`]});
    if(!granted) throw new Error('API 연결 권한이 필요합니다.');
    const old=await chrome.storage.local.get('apiUrl');
    if(old.apiUrl && old.apiUrl!==u.origin) await chrome.storage.local.remove('token');
    await chrome.storage.local.set({apiUrl:u.origin,postUrl:p.url}); notice.textContent='저장했습니다. 게시글을 새로고침하세요.';
  } catch(e){notice.textContent=e instanceof Error?e.message:'설정 실패';}
});
