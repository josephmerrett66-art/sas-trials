import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {findWarrens,nearestWarren,WarrenView,WARREN_CELL,MAX_WARRENS,ON_RUN_ODDS,OFF_RUN_ODDS} from '../warrens.js';
import {riverClearance,WORLD_SIZE,terrainHeight} from '../terrain.js';
import {Camp} from '../camp.js';
import {Wildlife} from '../wildlife.js';
import {lookTarget} from '../fieldcraft.js';
import {FieldKit} from '../kit.js';

// Warrens: fixed, spread one per cell at most, on level open ground away from rivers.
const warrens=findWarrens(),again=findWarrens(),cells=(WORLD_SIZE/WARREN_CELL)**2;
assert.deepEqual(warrens.map(w=>[w.x,w.z]),again.map(w=>[w.x,w.z]),'the same every run');
assert.ok(warrens.length>cells*.45&&warrens.length<=cells,`most cells have one (${warrens.length} of ${cells})`);
for(const w of warrens){assert.ok(riverClearance(w.x,w.z)>=8,'clear of rivers');assert.ok(Math.abs(terrainHeight(w.x+3,w.z)-terrainHeight(w.x-3,w.z))<=.8,'level ground');}
const blocked=findWarrens(()=>false);assert.equal(blocked.length,0,'never inside trees');
const w=warrens[Math.floor(warrens.length/2)];assert.equal(nearestWarren(warrens,w.x+3,w.z),w);assert.equal(nearestWarren(warrens,w.x+30,w.z),null,'only close by');{const far=nearestWarren(warrens,w.x+60,w.z,90);assert.ok(far&&Math.hypot(far.x-w.x-60,far.z-w.z)<=60.001,'a wider reach finds the closest');}
console.log(`Passed ${warrens.length} fixed warrens on level, open, dry ground and the nearest-warren lookup.`);

// One instanced draw for the warrens around you, rewritten only after moving.
const view=new WarrenView(new THREE.Scene(),warrens);view.update({x:w.x,z:w.z});assert.ok(view.mesh.count>=1&&view.mesh.count<=MAX_WARRENS);const count=view.mesh.count;view.mesh.count=0;view.update({x:w.x+2,z:w.z});assert.equal(view.mesh.count,0,'small moves do not rebuild');
console.log('Passed the bounded warren view.');

// Snares on a run catch far more often than ones set anywhere else.
const camp=new Camp(new THREE.Scene());let on=0,off=0;for(let i=0;i<200;i++){const chance=i/200;camp.reset();camp.setSnare(0,0,0,chance,ON_RUN_ODDS);if(Number.isFinite(camp.snares[0].catchAt))on++;camp.reset();camp.setSnare(0,0,0,chance,OFF_RUN_ODDS);if(Number.isFinite(camp.snares[0].catchAt))off++;}
assert.ok(on>=160&&off<=45,`on a run ${on}/200, elsewhere ${off}/200`);camp.reset();camp.setSnare(0,0,0,.5,ON_RUN_ODDS);assert.ok(camp.snares[0].catchAt<=6.3,'a catch still comes within a few hours');
console.log('Passed snare odds on and off a run.');

// Rabbits come out near a warren, never right beside you.
const life=new Wildlife(new THREE.Scene(),{home:()=>w});life.random=(()=>{let s=7;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};})();const player={x:w.x+40,z:w.z};let near=0;
for(let i=0;i<40;i++){const r={};if(life.spawn(r,player)){assert.ok(Math.hypot(r.x-player.x,r.z-player.z)>=18);if(Math.hypot(r.x-w.x,r.z-w.z)<20)near++;}}assert.ok(near>=25,`most spawns by the warren (${near}/40)`);
console.log('Passed rabbits spawning by warrens.');

// Looking at a warren offers a snare.
const kit=new FieldKit(()=>0);kit.pack();const me={x:0,z:0,yaw:0};
assert.deepEqual(lookTarget(me,kit,{warren:{x:0,z:-3}}),{act:'snare',label:'Rabbit runs · Set snare · G'});kit.snares=0;assert.deepEqual(lookTarget(me,kit,{warren:{x:0,z:-3}}),{act:null,label:'Rabbit runs · no snare wire left'});
console.log('Passed the warren look-at label.');
