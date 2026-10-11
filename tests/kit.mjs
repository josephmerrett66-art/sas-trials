import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {FieldKit,ITEMS,BASE_WEIGHT,packWeight,loadPace,defaultLoadout} from '../kit.js';
import {Controller} from '../controller.js';
import {createForest} from '../forest-scene.js';
import {makeCheckpoints,START} from '../navigation.js';
import {findSprings,nearbySpring,addSprings,updateSpringVisibility,SPRING_REACH} from '../springs.js';
import {terrainHeight} from '../terrain.js';

// Weight and pace.
const empty=Object.fromEntries(ITEMS.map(i=>[i.id,0])),full=Object.fromEntries(ITEMS.map(i=>[i.id,i.max]));
assert.equal(packWeight(empty),BASE_WEIGHT);assert.equal(loadPace(BASE_WEIGHT),1,'a bare bergen walks at full pace');
assert.ok(packWeight(full)>18&&loadPace(packWeight(full))<.7,'carrying everything is clearly slower');
assert.ok(loadPace(packWeight(defaultLoadout()))>loadPace(packWeight(full)));assert.equal(loadPace(100),.6,'pace never drops below 60%');

// Packing limits, then locks.
const kit=new FieldKit(()=>0);kit.set('water',99);assert.equal(kit.loadout.water,6);kit.set('water',-3);assert.equal(kit.loadout.water,0);kit.set('water',2);kit.set('rations',2);kit.set('filter',1);
kit.pack();assert.equal(kit.water,2);assert.equal(kit.rations,2);kit.set('water',5);assert.equal(kit.loadout.water,2,'loadout is fixed once packed');
const packed=kit.weight;assert.ok(Math.abs(packed-packWeight(kit.loadout))<1e-9,'packed weight matches the kit list');

// Needs drain with effort, load and climbing.
const rest=new FieldKit(),walk=new FieldKit(),sprint=new FieldKit();for(const k of [rest,walk,sprint])k.pack();
for(let i=0;i<600;i++){rest.step(.1,{effort:0});walk.step(.1,{effort:1});sprint.step(.1,{effort:1.6});}
assert.ok(rest.hydration>walk.hydration&&walk.hydration>sprint.hydration,'harder work means more thirst');assert.ok(walk.hydration<100&&walk.energy<100);
const flat=new FieldKit(),hill=new FieldKit();flat.pack();hill.pack();for(let i=0;i<600;i++){flat.step(.1);hill.step(.1,{climb:.03});}assert.ok(hill.hydration<flat.hydration,'climbing costs more');
const dry=new FieldKit(),wet=new FieldKit(),jacket=new FieldKit();jacket.set('waterproof',1);for(const k of [dry,wet,jacket])k.pack();for(let i=0;i<600;i++){dry.step(.1);wet.step(.1,{rain:1});jacket.step(.1,{rain:1});}
assert.ok(wet.energy<dry.energy,'rain saps energy');assert.ok(jacket.energy>wet.energy,'a waterproof protects against rain');

// Drinking, eating and weight loss.
const before=kit.weight;kit.hydration=40;assert.equal(kit.drink(),true);assert.equal(kit.water,1.5);assert.equal(kit.hydration,70);assert.ok(kit.weight<before,'drunk water is no longer carried');
kit.energy=10;assert.equal(kit.eat(),true);assert.equal(kit.energy,45);assert.equal(kit.rations,1);
const stove=new FieldKit();stove.set('stove',1);stove.pack();stove.energy=10;stove.eat();assert.equal(stove.energy,65,'a stove makes rations go further');
kit.drink();kit.drink();kit.drink();assert.equal(kit.water,0);assert.equal(kit.drink(),false,'empty bottles cannot be drunk');kit.eat();assert.equal(kit.eat(),false);

// Refilling: filtered water is safe, untreated water can make you ill.
assert.equal(kit.refill(),true);assert.equal(kit.water,2);assert.equal(kit.untreated,0);assert.equal(kit.refill(),false,'full bottles');
const raw=new FieldKit(()=>0);raw.set('filter',0);raw.pack();raw.drink();raw.drink();raw.drink();raw.drink();raw.refill();assert.equal(raw.untreated,2);raw.drink();assert.ok(raw.sick>0,'untreated water can cause illness');
const sickRate=raw.hydration;raw.hydration=sickRate;const healthy=new FieldKit();healthy.pack();healthy.hydration=sickRate;for(let i=0;i<100;i++){raw.step(.1);healthy.step(.1);}assert.ok(raw.hydration<healthy.hydration,'illness doubles thirst');
const none=new FieldKit(()=>1);none.set('water',0);none.pack();none.hydration=50;assert.equal(none.refill(),true);assert.equal(none.hydration,80,'with no bottles you can still drink at the spring');

// Running out slows you, then ends the attempt.
const tired=new FieldKit();tired.pack();const fresh=tired.pace;tired.hydration=10;assert.ok(tired.pace<fresh&&tired.strain>.5,'low hydration slows and strains');
tired.hydration=0;for(let i=0;i<590;i++)tired.step(.1,{effort:0});assert.equal(tired.withdrawn,null);for(let i=0;i<20;i++)tired.step(.1,{effort:0});assert.equal(tired.withdrawn,'Severe dehydration');assert.equal(tired.drink(),false);
tired.reset();assert.equal(tired.packed,false);assert.equal(tired.withdrawn,null);assert.equal(tired.hydration,100);

// Pace reaches the controller.
const run=(player,seconds)=>{const keys=new Set(['KeyW']);for(let i=0;i<Math.round(seconds*120);i++)player.step(1/120,keys);};
const light=new Controller(),heavy=new Controller();heavy.pace=.7;run(light,1);run(heavy,1);assert.equal(light.vz,-6);assert.ok(Math.abs(heavy.vz+4.2)<1e-9,'a heavy bergen walks at 70% speed');

// Springs: in hollows, reachable, clear of trees, tracks, posts and the start, and spread out.
const scene=new THREE.Scene(),obstacles=createForest(scene),points=makeCheckpoints(obstacles),springs=findSprings(obstacles,points);
assert.ok(springs.length>=6,`enough springs across the map (${springs.length})`);
for(const s of springs){assert.equal(s.y,terrainHeight(s.x,s.z));assert.ok(obstacles.every(o=>Math.hypot(s.x-o.x,s.z-o.z)>o.radius+4));assert.ok(points.every(p=>Math.hypot(s.x-p.x,s.z-p.z)>40));assert.ok(Math.hypot(s.x-START.x,s.z-START.z)>60);for(const t of springs)if(t!==s)assert.ok(Math.hypot(s.x-t.x,s.z-t.z)>260);}
const xs=springs.map(s=>s.x),zs=springs.map(s=>s.z);assert.ok(Math.max(...xs)-Math.min(...xs)>800&&Math.max(...zs)-Math.min(...zs)>800,'springs cover the map');
const s0=springs[0];assert.equal(nearbySpring(springs,{x:s0.x+SPRING_REACH-.1,z:s0.z,y:s0.y}),s0);assert.equal(nearbySpring(springs,{x:s0.x+SPRING_REACH+.5,z:s0.z,y:s0.y}),null);
const meshes=addSprings(new THREE.Scene(),springs);assert.equal(meshes.length,2,'all springs draw in two calls');
const tris=meshes.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0);assert.ok(tris<springs.length*500,`springs stay low-poly (${tris} triangles)`);
const cam={position:{x:START.x,z:START.z}};updateSpringVisibility(meshes,springs,cam,94);assert.ok(meshes.every(m=>!m.visible),'no spring draws from the start clearing');cam.position.x=s0.x+30;cam.position.z=s0.z;updateSpringVisibility(meshes,springs,cam,94);assert.ok(meshes.every(m=>m.visible));
const water=meshes[1].geometry.attributes.position;for(let i=0;i<water.count;i++)assert.ok(water.getY(i)>=terrainHeight(water.getX(i),water.getZ(i)),'water sits above the ground it covers');
console.log(`Passed kit weight and pace, packing lock, effort/load/climb/rain drain, drinking, eating, stove, refills, untreated illness, withdrawal, controller pace and ${springs.length} springs (${tris} triangles, 2 draws).`);
