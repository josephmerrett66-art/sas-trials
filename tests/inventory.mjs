import assert from 'node:assert/strict';
import {FieldKit} from '../kit.js';
import {backpackRows} from '../inventory-view.js';

const act=(rows,id)=>rows.flatMap(r=>r.actions).find(a=>a.act===id);
const kit=new FieldKit(()=>1);kit.pack();
let rows=backpackRows(kit,{});
assert.deepEqual(rows.map(r=>r.id),['water','rations','rabbit','wood','snares','stick','sleep'],'every survival item has a row');
assert.equal(act(rows,'drink').enabled,true);assert.equal(act(rows,'fill').enabled,false,'no water nearby');
assert.equal(act(rows,'eat-ration').enabled,true);assert.equal(act(rows,'eat-cooked').enabled,false);assert.equal(act(rows,'eat-raw').enabled,false);
assert.equal(act(rows,'light').enabled,false,'needs tinder, kindling and wood');assert.equal(act(rows,'chop').enabled,false,'no tree in reach');assert.equal(act(rows,'tinder').enabled,false,'no open ground');
assert.equal(act(rows,'snare').enabled,true);assert.equal(act(rows,'lift').enabled,false);assert.equal(act(rows,'throw').enabled,false);assert.equal(act(rows,'sleep').enabled,false,'too light to sleep');
assert.match(rows[0].detail,/2\.0 of 2 L/);
// Beside a tree with wood, then at a lit fire with a rabbit.
kit.wood=2;kit.sticks=1;kit.gatherTinder();kit.takeBranch();rows=backpackRows(kit,{tree:true,ground:true,water:true,rabbit:true,snare:{},post:{code:'C'},sleepable:true});
assert.equal(rows[0].id,'post');assert.equal(act(rows,'register').label,'Register C');
for(const id of ['chop','tinder','light','fill','throw','lift','sleep'])assert.equal(act(rows,id).enabled,true,id);
assert.equal(backpackRows(kit,{wet:true}).flatMap(r=>r.actions).find(a=>a.act==='light').enabled,false,'no fires in the river');
assert.equal(act(backpackRows(kit,{laid:true}),'strike').enabled,true,'a built fire is struck');
kit.raw=1;rows=backpackRows(kit,{fire:true});assert.equal(act(rows,'spit').enabled,true);assert.equal(act(backpackRows(kit,{fire:true,spitOn:true}),'spit').enabled,false,'one rabbit on the spit at a time');assert.equal(act(backpackRows(kit,{fire:true,spitOn:true,spitDone:true}),'take').enabled,true);assert.equal(act(rows,'stoke').enabled,true);assert.equal(act(rows,'light'),undefined,'a lit fire is stoked, not lit');
// Choosing what to eat.
kit.cooked=1;kit.energy=10;assert.equal(kit.eat('ration'),true);assert.equal(kit.cooked,1,'eating a ration keeps the cooked rabbit');assert.equal(kit.rations,0);
assert.equal(kit.eat('raw'),true);assert.equal(kit.raw,0);assert.equal(kit.rations,0);assert.equal(kit.cooked,1,'eating raw keeps rations and cooked meat');
assert.equal(kit.eat('cooked'),true);assert.equal(kit.cooked,0);assert.equal(kit.eat('cooked'),false);assert.equal(kit.eat('raw'),false);
console.log('Passed backpack rows for every survival action, context-dependent availability and choosing what to eat.');
