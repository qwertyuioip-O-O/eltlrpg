export const BALANCE = { maxEnergy: 20, rechargeMs: 300000, baseAttack: 15, levelAttack: 3, bossHp: 10000, attackXp: 12, attackGold: 10, clearGold: 100 };
export const BOSSES = ['가시 숲의 수호자', '잿불 골렘', '달빛 용'];
export type Slot = 'weapon' | 'armor' | 'charm';
export type Post = { key: string; url: string };
export function parsePost(input: string): Post | null {
  try {
    const u = new URL(input);
    if (u.protocol !== 'https:' || u.hostname !== 'gall.dcinside.com') return null;
    const paths: Record<string,string> = {'/board/view/':'normal','/mgallery/board/view/':'minor','/mini/board/view/':'mini'};
    const type = paths[u.pathname]; const id = u.searchParams.get('id'); const no = u.searchParams.get('no');
    if (!type || !id || !/^[a-zA-Z0-9_]+$/.test(id) || !no || !/^[1-9]\d*$/.test(no)) return null;
    return { key: `${type}:${id}:${no}`, url: `https://gall.dcinside.com${u.pathname}?id=${id}&no=${no}` };
  } catch { return null; }
}
export function koreaDay(now: number): string { return new Date(now + 9 * 3600000).toISOString().slice(0,10); }
export function energyAt(energy: number, timestamp: number, now: number) {
  if (energy >= BALANCE.maxEnergy) return { energy: BALANCE.maxEnergy, timestamp: now };
  const ticks = Math.max(0, Math.floor((now - timestamp) / BALANCE.rechargeMs));
  const next = Math.min(BALANCE.maxEnergy, energy + ticks);
  return { energy: next, timestamp: next === BALANCE.maxEnergy ? now : timestamp + ticks * BALANCE.rechargeMs };
}
export function levelAt(xp: number) { return 1 + Math.floor(Math.sqrt(xp / 100)); }
export function damageAt(xp: number, equipment: {slot:string;power:number;upgrade:number}[]) {
  return BALANCE.baseAttack + (levelAt(xp)-1)*BALANCE.levelAttack + equipment.reduce((n,i)=>n+i.power+i.upgrade*2,0);
}
export interface Item { id: string; slot: Slot; name: string; power: number; upgrade: number; equipped: boolean }
export interface State { day:string; boss:{name:string;hp:number;max_hp:number}; player:{nickname:string;xp:number;gold:number;energy:number;level:number;attack:number;nextEnergyAt:number|null}; items:Item[]; contribution:number; leaders:{nickname:string;damage:number}[]; rewards:{day:string;claimed:boolean;cleared:boolean}[]; serverTime:number }
export interface Reply { state?: State; damage?:number; stale?:boolean; error?:string; token?:string }
