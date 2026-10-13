import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {FieldKit} from '../kit.js';
import {Controller} from '../controller.js';
import {DayClock} from '../daycycle.js';
import {Camp} from '../camp.js';
import {NavigationExercise,makeCheckpoints} from '../navigation.js';
import {terrainHeight} from '../terrain.js';
import {snapshot,restore,readSave,writeSave,clearSave,SAVE_KEY} from '../save-game.js';

// A fake localStorage, and one that refuses everything like a locked-down private window.
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const broken={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}};

const world=()=>{const kit=new FieldKit(()=>.5),player=new Controller(terrainHeight),clock=new DayClock(),camp=new Camp(new THREE.Scene()),exercise=new NavigationExercise(makeCheckpoints([]));
 const obstacles=Array.from({length:10},(_,i)=>({x:i,z:i}));return {kit,player,clock,camp,exercise,gathered:new Set(),obstacles,groundHeight:terrainHeight};};

// Play a little of a run: repack, walk, burn time, light a fire, set a snare, take a post.
const a=world();
a.kit.pack();a.kit.hydration=61.25;a.kit.energy=48;a.kit.warmth=73;a.kit.awake=9.5;a.kit.wet=.4;a.kit.water=.8;a.kit.untreated=.3;a.kit.message='Drank 0.2 L';
a.kit.wood=2;a.kit.cooked=1;
Object.assign(a.player,{x:140.5,z:-320.25,yaw:1.2,pitch:-.3,stamina:42});
a.clock.hours=20.75;a.camp.light(141,-318,1.5);a.camp.setSpit();a.camp.spit.progress=.3;a.camp.setSnare(150,-322,a.clock.hours,.1);
a.exercise.stage=3;a.exercise.distance=1834.4;a.exercise.elevation=211;a.gathered.add(a.obstacles[2]).add(a.obstacles[7]);
const save=snapshot(a);
assert.ok(writeSave(save,storage));const text=store.get(SAVE_KEY);assert.ok(text.length<4000,`a save stays small (${text.length} bytes)`);

// Load it into a fresh game that has already wandered off somewhere else.
const b=world();b.kit.pack();b.kit.hydration=5;b.clock.hours=9;b.player.x=999;b.exercise.stage=7;b.gathered.add(b.obstacles[0]);
assert.ok(restore(readSave(storage),b));
assert.equal(b.kit.packed,true);
for(const k of ['hydration','energy','warmth','awake','wet','water','untreated','message'])assert.equal(b.kit[k],a.kit[k],k);
assert.deepEqual(b.kit.bergen.save(),a.kit.bergen.save(),'the bergen comes back exactly as it was arranged');
assert.equal(b.kit.wood,2);assert.equal(b.kit.cooked,1);assert.equal(b.kit.rations,a.kit.rations);
assert.deepEqual(b.kit.layout,a.kit.layout,'resetting later still repacks the chosen layout');
assert.equal(b.player.x,140.5);assert.equal(b.player.z,-320.25);assert.equal(b.player.yaw,1.2);assert.equal(b.player.stamina,42);
assert.ok(Math.abs(b.player.y-terrainHeight(140.5,-320.25))<1e-9,'you stand on the ground where you saved');
assert.equal(b.clock.hours,20.75);
assert.ok(b.camp.fire&&b.camp.fire.x===141&&Math.abs(b.camp.fire.fuel-1.5)<1e-9,'the fire is still burning');assert.equal(b.camp.lit,true);assert.ok(b.camp.spit&&Math.abs(b.camp.spit.progress-.3)<1e-9,'the rabbit is still on the spit');
assert.equal(b.camp.snares.length,1);assert.equal(b.camp.snares[0].catchAt,a.camp.snares[0].catchAt,'a set snare keeps its catch time');
assert.equal(b.exercise.stage,3);assert.equal(b.exercise.distance,1834.4);
assert.deepEqual([...b.gathered],[b.obstacles[2],b.obstacles[7]],'trees you already took wood from stay bare');

// A snare that will never catch survives JSON (Infinity is not valid JSON).
const c=world();c.kit.pack();c.camp.setSnare(10,10,8,.95);assert.equal(c.camp.snares[0].catchAt,Infinity);
const back=JSON.parse(JSON.stringify(snapshot(c)));const d=world();assert.ok(restore(back,d));assert.equal(d.camp.snares[0].catchAt,Infinity);
assert.equal(d.camp.fire,null);
// A built fire not yet struck comes back unlit; old saves without the flag come back burning.
c.camp.light(5,5,2,false);let r=world();assert.ok(restore(JSON.parse(JSON.stringify(snapshot(c))),r));assert.equal(r.camp.laid,true);assert.equal(r.camp.lit,false);
const old=JSON.parse(JSON.stringify(snapshot(c)));delete old.camp.fire.burning;delete old.camp.spit;r=world();assert.ok(restore(old,r));assert.equal(r.camp.lit,true);

// Bad or old saves change nothing; storage that refuses access never throws.
const e=world();e.player.x=5;
assert.equal(restore(null,e),false);assert.equal(restore({...save,version:0},e),false);assert.equal(restore({version:1},e),false);assert.equal(e.player.x,5);
store.set(SAVE_KEY,'{not json');assert.equal(readSave(storage),null);
assert.equal(writeSave(save,broken),false);assert.equal(readSave(broken),null);clearSave(broken);
clearSave(storage);assert.equal(readSave(storage),null);
console.log('save game: round trip, bergen layout, fire, snares, posts, bad saves');
