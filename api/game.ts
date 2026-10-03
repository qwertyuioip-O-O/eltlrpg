import pg from 'pg';
import { randomBytes, randomUUID, createHash, randomInt } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { BALANCE, BOSSES, parsePost, koreaDay, energyAt, levelAt, damageAt } from '../src/shared.js';
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,max:3});
const hash = (v:string) => createHash('sha256').update(v).digest('hex');
class GameError extends Error { constructor(public status:number,message:string){super(message);} }
export async function execute(db:pg.Pool, body:any, token:string, now=Date.now(), allowed=process.env.ALLOWED_POSTS ?? '') {
  const post = typeof body?.post === 'string' ? parsePost(body.post) : null;
  if (!post || !allowed.split(',').some(u=>parsePost(u.trim())?.key===post.key)) throw new GameError(403,'등록되지 않은 게시글입니다.');
  const actions = ['register','state','attack','claim','equip','upgrade'];
  if (!actions.includes(body.action)) throw new GameError(400,'잘못된 행동입니다.');
  const room=post.key, day=koreaDay(now), c=await db.connect();
  try {
    await c.query('BEGIN');
    // Small MVP: serialize a room, including midnight rollover and last-hit settlement.
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[room]);
    if (body.action==='register') {
      const nickname=String(body.nickname ?? '').trim();
      if (!nickname || nickname.length>16) throw new GameError(400,'닉네임은 1~16자로 입력하세요.');
      const issued=randomBytes(32).toString('hex'), id=randomUUID();
      await c.query('INSERT INTO players(id,token_hash,nickname,energy_at) VALUES($1,$2,$3,$4)',[id,hash(issued),nickname,now]);
      await c.query("INSERT INTO items(id,player_id,slot,name,power,equipped) VALUES($1,$2,'weapon','낡은 검',5,true)",[randomUUID(),id]);
      await c.query('COMMIT'); return {token:issued};
    }
    if (!/^[a-f0-9]{64}$/.test(token)) throw new GameError(401,'게스트 인증이 필요합니다.');
    const p=(await c.query('SELECT * FROM players WHERE token_hash=$1 FOR UPDATE',[hash(token)])).rows[0];
    if (!p) throw new GameError(401,'인증 정보가 유효하지 않습니다.');
    await c.query('UPDATE bosses SET ended=true WHERE room=$1 AND day<$2 AND NOT ended',[room,day]);
    const index=Math.floor(Date.parse(day+'T00:00:00Z')/86400000)%BOSSES.length;
    await c.query('INSERT INTO bosses(room,day,name,hp,max_hp) VALUES($1,$2,$3,$4,$4) ON CONFLICT DO NOTHING',[room,day,BOSSES[index],BALANCE.bossHp]);
    const b=(await c.query('SELECT * FROM bosses WHERE room=$1 AND day=$2 FOR UPDATE',[room,day])).rows[0];
    const e=energyAt(p.energy,Number(p.energy_at),now); p.energy=e.energy; p.energy_at=e.timestamp;
    let damage:number|undefined, stale=false;
    const mutation=body.action!=='state';
    let payloadHash='';
    if (mutation) {
      if (typeof body.requestId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId)) throw new GameError(400,'요청 ID가 필요합니다.');
      payloadHash=hash(JSON.stringify([room,body.action,body.day,body.mode,body.itemId]));
      const previous=(await c.query('SELECT * FROM requests WHERE player_id=$1 AND request_id=$2',[p.id,body.requestId])).rows[0];
      if(previous) {
        if(previous.payload_hash!==payloadHash) throw new GameError(409,'요청 ID가 다른 행동에 사용되었습니다.');
        await c.query('COMMIT'); return previous.response;
      }
    }
    if(body.action==='attack') {
      if(body.day!==day) stale=true;
      else {
        if(!['raid','practice'].includes(body.mode)) throw new GameError(400,'전투 모드가 잘못되었습니다.');
        if(body.mode==='raid' && b.hp===0) throw new GameError(409,'보스를 처치했습니다. 새로고침 후 연습 전투를 이용하세요.');
        if(body.mode==='practice' && b.hp>0) throw new GameError(409,'공동 보스 처치 후 연습할 수 있습니다.');
        if(p.energy<1) throw new GameError(409,'행동력이 부족합니다.');
        const equipped=(await c.query('SELECT * FROM items WHERE player_id=$1 AND equipped',[p.id])).rows;
        damage=damageAt(p.xp,equipped);
        if(body.mode==='raid') {
          damage=Math.min(damage,b.hp); b.hp-=damage;
          await c.query('UPDATE bosses SET hp=$3 WHERE room=$1 AND day=$2',[room,day,b.hp]);
          await c.query('INSERT INTO contributions(room,day,player_id,damage) VALUES($1,$2,$3,$4) ON CONFLICT(room,day,player_id) DO UPDATE SET damage=contributions.damage+EXCLUDED.damage',[room,day,p.id,damage]);
        }
        p.energy--; p.xp+=BALANCE.attackXp; p.gold+=BALANCE.attackGold;
      }
    }
    if(body.action==='claim') {
      if(typeof body.day!=='string') throw new GameError(400,'보상 날짜가 필요합니다.');
      const reward=(await c.query('SELECT co.*,b.hp,b.ended FROM contributions co JOIN bosses b USING(room,day) WHERE co.room=$1 AND co.day=$2 AND co.player_id=$3 FOR UPDATE OF co',[room,body.day,p.id])).rows[0];
      if(!reward || reward.claimed || (!reward.ended && reward.hp>0)) throw new GameError(409,'아직 받을 수 없거나 이미 받은 보상입니다.');
      const slots=['weapon','armor','charm'], names=['보스의 검','수호 갑옷','달빛 부적']; const i=randomInt(3);
      await c.query('INSERT INTO items(id,player_id,slot,name,power) VALUES($1,$2,$3,$4,$5)',[randomUUID(),p.id,slots[i],names[i],randomInt(6,13)]);
      if(reward.hp===0) p.gold+=BALANCE.clearGold;
      await c.query('UPDATE contributions SET claimed=true WHERE room=$1 AND day=$2 AND player_id=$3',[room,body.day,p.id]);
    }
    if(body.action==='equip' || body.action==='upgrade') {
      if(typeof body.itemId!=='string' || !/^[0-9a-f-]{36}$/i.test(body.itemId)) throw new GameError(400,'장비 ID가 잘못되었습니다.');
      const item=(await c.query('SELECT * FROM items WHERE id=$1 AND player_id=$2 FOR UPDATE',[body.itemId,p.id])).rows[0];
      if(!item) throw new GameError(404,'장비를 찾을 수 없습니다.');
      if(body.action==='equip') {
        await c.query('UPDATE items SET equipped=false WHERE player_id=$1 AND slot=$2',[p.id,item.slot]);
        await c.query('UPDATE items SET equipped=true WHERE id=$1',[item.id]);
      } else {
        const cost=(item.upgrade+1)*50;
        if(item.upgrade>=20 || p.gold<cost) throw new GameError(409,'골드가 부족하거나 최대 강화입니다.');
        p.gold-=cost; await c.query('UPDATE items SET upgrade=upgrade+1 WHERE id=$1',[item.id]);
      }
    }
    await c.query('UPDATE players SET xp=$2,gold=$3,energy=$4,energy_at=$5 WHERE id=$1',[p.id,p.xp,p.gold,p.energy,p.energy_at]);
    const items=(await c.query('SELECT id,slot,name,power,upgrade,equipped FROM items WHERE player_id=$1 ORDER BY slot,id',[p.id])).rows;
    const contribution=(await c.query('SELECT damage FROM contributions WHERE room=$1 AND day=$2 AND player_id=$3',[room,day,p.id])).rows[0]?.damage ?? 0;
    const leaders=(await c.query('SELECT p.nickname,c.damage FROM contributions c JOIN players p ON p.id=c.player_id WHERE room=$1 AND day=$2 ORDER BY damage DESC,c.player_id LIMIT 10',[room,day])).rows;
    const rewards=(await c.query('SELECT c.day,c.claimed,(b.hp=0) AS cleared FROM contributions c JOIN bosses b USING(room,day) WHERE c.room=$1 AND c.player_id=$2 AND NOT c.claimed AND (b.ended OR b.hp=0) ORDER BY c.day',[room,p.id])).rows;
    const response={damage,stale,state:{day,boss:{name:b.name,hp:b.hp,max_hp:b.max_hp},player:{nickname:p.nickname,xp:p.xp,gold:p.gold,energy:p.energy,level:levelAt(p.xp),attack:damageAt(p.xp,items.filter(i=>i.equipped)),nextEnergyAt:p.energy<BALANCE.maxEnergy?p.energy_at+BALANCE.rechargeMs:null},items,contribution,leaders,rewards,serverTime:now}};
    if(mutation) await c.query('INSERT INTO requests(player_id,request_id,payload_hash,response) VALUES($1,$2,$3,$4)',[p.id,body.requestId,payloadHash,JSON.stringify(response)]);
    await c.query('COMMIT'); return response;
  } catch(err) { await c.query('ROLLBACK'); throw err; } finally { c.release(); }
}
export default async function handler(req:IncomingMessage & {body?:any},res:ServerResponse) {
  res.setHeader('Cache-Control','no-store'); res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST') { res.statusCode=405; res.end(JSON.stringify({error:'POST only'})); return; }
  try {
    let body=req.body;
    if(!body) { let raw=''; for await(const chunk of req) { raw+=chunk; if(raw.length>8192) throw new GameError(413,'요청이 너무 큽니다.'); } body=JSON.parse(raw); }
    if(typeof body==='string') body=JSON.parse(body);
    const token=String(req.headers.authorization??'').replace(/^Bearer /,'');
    res.end(JSON.stringify(await execute(pool,body,token)));
  } catch(err) { res.statusCode=err instanceof GameError?err.status:500; res.end(JSON.stringify({error:err instanceof GameError?err.message:'서버 연결에 문제가 있습니다.'})); if(!(err instanceof GameError)) console.error('Game request failed',err instanceof Error?err.message:'unknown'); }
}
