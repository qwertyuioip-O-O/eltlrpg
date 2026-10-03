import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {execute} from '../api/game.js';
const post='https://gall.dcinside.com/board/view/?id=test&no=1';
// PGlite owns one connection: queue transactions. Real Postgres uses advisory locks.
async function fixture(){
  const embedded=new PGlite();await embedded.exec(await readFile(new URL('../db/001_init.sql',import.meta.url),'utf8'));
  let queue=Promise.resolve();
  const pool={connect:async()=>{const before=queue;let release!:()=>void;queue=new Promise<void>(r=>release=r);await before;return {query:async(sql:string,params?:any[])=>sql.includes('pg_advisory_xact_lock')?{rows:[]}:embedded.query(sql,params),release};}} as unknown as pg.Pool;
  return {embedded,pool};
}
test('SQL integration: attacks, replay, ownership, rewards, practice and rollover',async()=>{
  const {embedded,pool}=await fixture();const now=Date.parse('2026-10-03T14:00:00Z');
  const run=(token:string,body:any,time=now)=>execute(pool,{post,...body},token,time,post);
  try {
    const a=(await run('',{action:'register',nickname:'A'})).token!,b=(await run('',{action:'register',nickname:'B'})).token!;
    let s:any=await run(a,{action:'state'});assert.equal(s.state.player.energy,20);
    const id=randomUUID(),action={action:'attack',mode:'raid',day:s.state.day,requestId:id};
    const hit:any=await run(a,action);assert.equal(hit.damage,20);assert.equal(hit.state.player.energy,19);
    assert.deepEqual(await run(a,action),JSON.parse(JSON.stringify(hit)));
    await assert.rejects(run(a,{...action,mode:'practice'}),/다른 행동/);
    const foreign:any=await run(b,{action:'state'});
    await assert.rejects(run(a,{action:'equip',itemId:foreign.state.items[0].id,requestId:randomUUID()}),/찾을 수/);
    await embedded.query('UPDATE bosses SET hp=10');
    const results:any[]=await Promise.all([run(a,{...action,requestId:randomUUID()}),run(b,{...action,requestId:randomUUID()}).catch(e=>({error:e.message}))]);
    assert.equal(results[0].damage,10);assert.match(results[1].error,/처치/);
    const claim={action:'claim',day:s.state.day,requestId:randomUUID()};const reward:any=await run(a,claim);assert.equal(reward.state.items.length,2);assert.equal(reward.state.player.gold,120);
    await run(a,claim);await assert.rejects(run(a,{...claim,requestId:randomUUID()}),/이미 받은/);
    const practiced:any=await run(a,{action:'attack',mode:'practice',day:s.state.day,requestId:randomUUID()});assert.equal(practiced.state.items.length,2);assert.equal(practiced.state.contribution,30);
    const starter=practiced.state.items.find((i:any)=>i.equipped);
    const upgraded:any=await run(a,{action:'upgrade',itemId:starter.id,requestId:randomUUID()});assert.equal(upgraded.state.player.gold,80);assert.equal(upgraded.state.player.attack,22);
    const drop=upgraded.state.items.find((i:any)=>!i.equipped);const equipped:any=await run(a,{action:'equip',itemId:drop.id,requestId:randomUUID()});assert.equal(equipped.state.items.filter((i:any)=>i.slot===drop.slot&&i.equipped).length,1);
    const next=Date.parse('2026-10-03T15:00:00Z');
    const stale:any=await run(a,{...action,requestId:randomUUID()},next);assert.equal(stale.stale,true);assert.equal(stale.state.player.energy,20);assert.equal(stale.state.boss.hp,10000);assert.equal(stale.state.player.xp,36);
    const fresh:any=await run(b,{action:'attack',mode:'raid',day:stale.state.day,requestId:randomUUID()},next);
    const expired:any=await run(b,{action:'state'},next+86400000);assert.equal(expired.state.rewards[0].cleared,false);
    const participation:any=await run(b,{action:'claim',day:fresh.state.day,requestId:randomUUID()},next+86400000);assert.equal(participation.state.items.length,2);assert.equal(participation.state.player.gold,10);
    await assert.rejects(execute(pool,{post:'https://gall.dcinside.com/board/view/?id=other&no=2',action:'state'},a,now,post),/등록되지/);
  } finally {await embedded.close();}
});
