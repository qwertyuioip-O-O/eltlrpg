import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parsePost,koreaDay,energyAt,damageAt,levelAt} from '../src/shared.js';
test('post identities normalize query order and reject unrelated pages',()=>{
  for(const [path,type] of [['board','normal'],['mgallery/board','minor'],['mini/board','mini']]) assert.equal(parsePost(`https://gall.dcinside.com/${path}/view/?no=12&id=test&page=2`)?.key,`${type}:test:12`);
  for(const u of ['https://evil.test/board/view/?id=a&no=1','https://gall.dcinside.com/board/lists/?id=a','https://gall.dcinside.com/board/view/?id=a&no=-1']) assert.equal(parsePost(u),null);
});
test('Korean midnight boundary',()=>{assert.equal(koreaDay(Date.parse('2026-10-03T14:59:59Z')),'2026-10-03');assert.equal(koreaDay(Date.parse('2026-10-03T15:00:00Z')),'2026-10-04');});
test('energy caps, preserves partial ticks and starts recovery from full',()=>{assert.deepEqual(energyAt(18,0,650000),{energy:20,timestamp:650000});assert.deepEqual(energyAt(1,0,350000),{energy:2,timestamp:300000});assert.deepEqual(energyAt(20,0,999000),{energy:20,timestamp:999000});});
test('level and equipment determine damage',()=>{assert.equal(levelAt(100),2);assert.equal(damageAt(100,[{slot:'weapon',power:5,upgrade:2}]),27);});
