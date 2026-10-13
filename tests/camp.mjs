import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {DayClock,daylightAt,sunHeight,formatClock,START_HOUR} from '../daycycle.js';
import {FieldKit,BURN_PER_WOOD,MAX_WOOD,TIRED_HOURS,SPENT_HOURS,warmthWord,fatigueWord,SPIT_HOURS,strikeChance,BROKEN_SLEEP_HOURS,BOIL_HOURS} from '../kit.js';
import {Camp,FIRE_REACH} from '../camp.js';
import {Wildlife,RABBITS,THROW_RANGE} from '../wildlife.js';
import {terrainHeight} from '../terrain.js';

// Clock: one real second is one game minute; light follows the sun.
const clock=new DayClock();assert.equal(clock.hour,START_HOUR);assert.equal(clock.label,'Day 1 · 09:00');
clock.step(90);assert.equal(clock.label,'Day 1 · 10:30');
assert.ok(daylightAt(13)===1&&daylightAt(1)===0,'bright midday, dark midnight');
assert.ok(sunHeight(5)<.01&&sunHeight(21)<.01&&sunHeight(5)>-.01,'the sun sets at 21:00 and rises at 05:00');
assert.ok(daylightAt(19)>.9&&daylightAt(22)<.1,'a long summer evening, then night');
clock.hours=20;assert.ok(clock.dusk>.3,'warm light at sunset');clock.hours=13;assert.equal(clock.dusk,0);
assert.equal(clock.sleepable,false);clock.hours=22;assert.equal(clock.sleepable,true);assert.equal(clock.untilWake(),7.5);
clock.setMode('day');assert.equal(clock.daylight,1);clock.setMode('night');assert.equal(clock.darkness,1);clock.setMode('cycle');
assert.equal(formatClock(24+6.25),'Day 2 · 06:15');clock.reset();assert.equal(clock.hours,START_HOUR);

// Warmth: night and rain chill, a fire warms, wet clothes are worst.
const hour=k=>{for(let i=0;i<60;i++)k();};
const night=new FieldKit(),fireside=new FieldKit(),rain=new FieldKit(),jacket=new FieldKit(),soaked=new FieldKit();jacket.set('waterproof',1);
for(const k of [night,fireside,rain,jacket,soaked])k.pack();
hour(()=>{night.step(1,{effort:0,dark:1});fireside.step(1,{effort:0,dark:1,fire:true});rain.step(1,{effort:0,rain:1});jacket.step(1,{effort:0,rain:1});});
soaked.step(1,{effort:0,soaked:true});hour(()=>soaked.step(1,{effort:0}));
assert.ok(night.warmth<92&&night.warmth>90,'an hour of night costs about 9%');assert.equal(fireside.warmth,100,'a fire keeps you warm');
assert.ok(jacket.warmth>rain.warmth,'a waterproof keeps out the rain');assert.ok(soaked.warmth<night.warmth,'wading soaks you');
const sunny=new FieldKit();sunny.pack();sunny.warmth=50;hour(()=>sunny.step(1,{effort:1,sun:1}));assert.ok(sunny.warmth>55,'walking in the sun warms you up');
assert.equal(warmthWord(80),'Warm');assert.equal(warmthWord(20),'Shivering');
// Cold slows you, then ends the attempt.
const cold=new FieldKit();cold.pack();const pace=cold.pace;cold.warmth=10;assert.ok(cold.pace<pace&&cold.strain>.5);
cold.warmth=0;for(let i=0;i<61;i++)cold.step(1,{effort:0,hours:0});assert.equal(cold.withdrawn,'Hypothermia');

// Fatigue: a long day is fine, a night without sleep is not.
const awake=new FieldKit();awake.pack();assert.equal(fatigueWord(awake.awake),'Rested');
awake.step(1,{hours:TIRED_HOURS});const tiredPace=awake.pace;assert.equal(fatigueWord(awake.awake),'Tired');
const rested=new FieldKit();rested.pack();assert.ok(tiredPace<rested.pace,'tiredness slows you');
awake.step(1,{hours:SPENT_HOURS-awake.awake});assert.equal(awake.withdrawn,'Exhaustion: no sleep');

// Wood, fire and cooking.
const camper=new FieldKit(()=>.99);camper.pack();assert.equal(camper.layFire(),0,'no wood, no fire');assert.match(camper.message,/tinder.*branch for kindling.*dead wood/,'the message lists what is missing');
for(let i=0;i<MAX_WOOD+2;i++)camper.gatherWood();assert.equal(camper.wood,MAX_WOOD,'wood carried is limited');
const weight=camper.weight;assert.ok(weight>new FieldKit().weight,'wood weighs something');
assert.equal(camper.layFire(),0,'wood alone is not enough');camper.gatherTinder();camper.takeBranch();assert.deepEqual(camper.fireMissing,[]);
assert.equal(camper.layFire(),BURN_PER_WOOD+.5);assert.equal(camper.wood,MAX_WOOD-1);assert.equal(camper.tinder,0);assert.equal(camper.branches,0);
assert.equal(camper.stokeFire(1),1+BURN_PER_WOOD);assert.equal(camper.wood,MAX_WOOD-2);
for(let i=0;i<5;i++)camper.gatherTinder();assert.equal(camper.tinder,3,'tinder carried is limited');camper.tinder=0;
const axe=new FieldKit();axe.pack();assert.equal(axe.has('hatchet'),true,'a hatchet is packed by default');axe.gatherWood(2);assert.equal(axe.wood,2);assert.match(axe.message,/Chopped/);
const shave=new FieldKit();shave.pack();shave.takeBranch();shave.whittle();assert.equal(shave.tinder,1,'whittling leaves shavings for tinder');
const nosteel=new FieldKit();nosteel.set('firesteel',0);nosteel.pack();nosteel.wood=4;nosteel.tinder=1;nosteel.branches=1;assert.equal(nosteel.layFire(),0,'a fire steel is needed');
camper.catchRabbit();assert.equal(camper.raw,1);assert.equal(camper.spitRabbit(),true);assert.equal(camper.raw,0);assert.equal(camper.spitRabbit(),false);assert.equal(camper.takeCooked(),true);assert.equal(camper.cooked,1);
camper.energy=20;camper.eat();assert.equal(camper.energy,65,'cooked rabbit is eaten first');assert.equal(camper.rations,1);
const raw=new FieldKit(()=>0);raw.set('rations',0);raw.pack();raw.raw=1;raw.energy=20;raw.eat();assert.equal(raw.energy,35);assert.ok(raw.sick>0,'raw meat can make you ill');
const boil=new FieldKit();boil.set('stove',1);boil.set('filter',0);boil.pack();boil.water=0;boil.refill();assert.ok(boil.untreated>1);const litres=boil.boilWater();assert.ok(litres>1);assert.equal(boil.untreated,0);assert.ok(boil.water<.001,'the water goes into the mess tin');assert.equal(boil.boilWater(),0,'nothing left to boil');
boil.takeBoiled(litres);assert.ok(Math.abs(boil.water-litres)<1e-9);assert.equal(boil.untreated,0,'boiled water is safe');
const tinless=new FieldKit();tinless.set('filter',0);tinless.pack();tinless.water=0;tinless.refill();assert.equal(tinless.boilWater(),0,'no mess tin, no boiling');
// Snares.
assert.equal(camper.snares,2);assert.equal(camper.setSnare(),true);assert.equal(camper.snares,1);camper.recoverSnare(true);assert.equal(camper.snares,2);assert.equal(camper.raw,1);

// Sleep: needs a fire or a sleeping bag; a fire that dies leaves you cold.
const sleeper=new FieldKit();sleeper.pack();sleeper.awake=18;assert.equal(sleeper.sleep(7.5),0,'too cold to sleep in the open');
assert.equal(sleeper.sleep(7.5,{fire:8,shelter:'debris'}),7.5);assert.equal(sleeper.awake,0);assert.equal(sleeper.warmth,100);assert.ok(sleeper.hydration<100);
const short=new FieldKit();short.pack();short.sleep(7.5,{fire:3,shelter:'debris'});assert.ok(short.warmth<80&&short.warmth>30,'the fire burned out');assert.match(short.message,/died/);
const bag=new FieldKit();bag.set('bedroll',1);bag.pack();assert.equal(bag.sleep(7.5,{shelter:'tarp'}),7.5);assert.ok(bag.warmth>70,'a sleeping bag keeps you warm enough');
const stormy=new FieldKit();stormy.pack();stormy.warmth=40;const slept=stormy.sleep(7.5,{fire:1,rain:1,shelter:'debris'});assert.ok(slept<7.5,'cold wakes you early');assert.match(stormy.message,/shivering/);

// Away from a basha, sleep is short and broken; the sheet keeps rain off better than bracken.
const open=new FieldKit();open.pack();open.awake=18;assert.equal(open.sleep(7.5,{fire:8}),BROKEN_SLEEP_HOURS);assert.ok(open.awake>0,'a broken sleep does not fully rest you');assert.match(open.message,/Pitch a basha/);
const wetTarp=new FieldKit();wetTarp.set('bedroll',1);wetTarp.pack();wetTarp.sleep(7.5,{rain:1,shelter:'tarp'});const wetDebris=new FieldKit();wetDebris.set('bedroll',1);wetDebris.pack();wetDebris.sleep(7.5,{rain:1,shelter:'debris'});assert.ok(wetTarp.warmth>wetDebris.warmth,'the bivvy sheet keeps more rain off');
const builder=new FieldKit();builder.pack();assert.equal(builder.buildBasha(),null);assert.match(builder.message,/2 branches/);builder.branches=2;assert.equal(builder.buildBasha(),'debris');assert.equal(builder.branches,0);
const sheet=new FieldKit();sheet.set('bedroll',1);sheet.pack();sheet.branches=3;assert.equal(sheet.buildBasha(),'tarp');assert.equal(sheet.branches,1);

// Campfire and snares in the world: one reusable fire, bounded snares, few draws.
const scene=new THREE.Scene(),camp=new Camp(scene);assert.equal(camp.group.visible,false);
camp.light(40,-60,3);assert.ok(camp.lit);assert.equal(camp.fire.y,terrainHeight(40,-60));
const player={x:40,z:-60+FIRE_REACH-.5};assert.ok(camp.warming(player));player.z+=1;assert.equal(camp.warming(player),false);
const glow=camp.glow.geometry.attributes.position;for(let i=0;i<glow.count;i+=7)assert.ok(Math.abs(glow.getY(i)+camp.fire.y-terrainHeight(40+glow.getX(i),-60+glow.getZ(i))-.06)<1e-4,'the glow lies on the ground');
camp.step(60,0,{rain:0});assert.ok(Math.abs(camp.fire.fuel-2)<1e-9,'a fire burns an hour of fuel each game hour');camp.burn(1,1);assert.ok(Math.abs(camp.fire.fuel-.5)<1e-9,'rain burns it faster');camp.burn(5);assert.equal(camp.lit,false);
// A laid fire waits for a spark; a rabbit on the spit roasts only while it burns.
camp.light(40,-60,2,false);assert.equal(camp.lit,false);assert.equal(camp.laid,true);camp.burn(1);assert.equal(camp.fire.fuel,2,'a laid fire does not burn');camp.step(.1,0,{});assert.ok(camp.strength.value<.01,'no flames before it is lit');
camp.strike();assert.equal(camp.sparks.visible,true);camp.step(.5,0,{});assert.equal(camp.sparks.visible,false,'sparks die away');
assert.equal(camp.setSpit(),false,'no spit over a cold fire');camp.ignite();assert.equal(camp.lit,true);assert.equal(camp.setSpit(),true);assert.equal(camp.setSpit(),false,'one rabbit at a time');
camp.burn(SPIT_HOURS/2);assert.equal(camp.spitDone,false);assert.equal(camp.takeSpit(),false);camp.burn(SPIT_HOURS);assert.equal(camp.spitDone,true);assert.equal(camp.spitMesh.geometry,camp.spitGeometries[1],'it browns');
assert.equal(camp.takeSpit(),true);assert.equal(camp.spitMesh.visible,false);
camp.light(40,-60,.2);camp.setSpit();camp.burn(2);assert.equal(camp.spitDone,false,'a fire that dies leaves it half done');
assert.ok(Math.abs(strikeChance(1)-.16)<1e-9&&strikeChance(0)===.4,'rain makes the steel harder to catch');
camp.setSnare(10,10,0,.1);camp.setSnare(20,20,0,.9);assert.equal(camp.snareMesh.count,2);
const s=camp.nearSnare({x:10.5,z:10});assert.ok(s);camp.step(0,1,{});assert.equal(camp.caughtMesh.count,0);camp.step(0,3,{});assert.equal(camp.caughtMesh.count,1,'a caught rabbit shows in the snare');
assert.equal(camp.checkSnare(s,3),true);assert.equal(camp.checkSnare(camp.nearSnare({x:20,z:20}),50),false,'some snares never catch');assert.equal(camp.snareMesh.count,0);
const draws=[];scene.traverse(o=>{if(o.isMesh)draws.push(o.name||'fire part');});assert.ok(draws.length<=8,'campfire, spit, mess tin, basha, snares and caught rabbits are a handful of draws');camp.reset();assert.equal(camp.spitMesh.visible,false,'the spit only draws while roasting');assert.equal(camp.potMesh.visible,false);assert.equal(camp.bashaMesh.visible,false,'no basha until you pitch one');
// The mess tin boils while the fire burns; the basha stands where it was pitched, one at a time.
camp.light(0,0,3);assert.equal(camp.setPot(0),false,'an empty tin is not put on');assert.equal(camp.setPot(.6),true);assert.equal(camp.setPot(.6),false,'one tin at a time');assert.equal(camp.takePot(),0,'not boiled yet');
camp.burn(BOIL_HOURS);assert.equal(camp.potDone,true);assert.equal(camp.potMesh.geometry,camp.potGeometries[1],'steam shows when it has boiled');assert.equal(camp.takePot(),.6);assert.equal(camp.pot,null);
const unlit=new Camp(new THREE.Scene());unlit.light(0,0,2,false);assert.equal(unlit.setPot(.5),false,'a laid fire boils nothing');
camp.pitch(5,5,.4,'debris');assert.equal(camp.bashaMesh.visible,true);assert.equal(camp.bashaMesh.geometry,camp.bashaGeometries.debris);assert.ok(camp.nearShelter({x:6,z:6}));assert.equal(camp.nearShelter({x:9,z:9}),false);
camp.pitch(-5,-5,0,'tarp');assert.ok(camp.nearShelter({x:-5,z:-4}));assert.equal(camp.nearShelter({x:6,z:6}),false,'pitching again moves the basha');
camp.step(1,0,{camera:{position:{x:500,z:500}}});assert.equal(camp.bashaMesh.visible,false,'a far basha is not drawn');camp.reset();
assert.equal(scene.children.filter(o=>o.isLight).length,0,'no extra lights');

// Rabbits: bounded pool, flee when disturbed, crouching gets you closer.
const life=new Wildlife(new THREE.Scene()),walker={x:-130,z:30,vx:2,vz:0,state:'MOVING'};
for(let i=0;i<400;i++)life.step(.05,walker,{activity:1});const live=life.rabbits.filter(r=>r.active);
assert.ok(live.length>=3&&live.length<=RABBITS,`rabbits come out (${live.length})`);assert.equal(life.mesh.count,live.length);
for(const r of live){assert.ok(Math.abs(r.y-terrainHeight(r.x,r.z))<1e-6);assert.ok(Math.hypot(r.x-walker.x,r.z-walker.z)>8);}
assert.ok(Wildlife.noticeRange({state:'CROUCHED'})<Wildlife.noticeRange({state:'MOVING',vx:3,vz:0}),'crouching lets you creep closer');
const r=live[0];r.x=walker.x;r.z=walker.z-6;r.state='graze';const startD=6;for(let i=0;i<40;i++)life.step(.05,walker,{activity:1});assert.ok(Math.hypot(r.x-walker.x,r.z-walker.z)>startD+3,'a disturbed rabbit bolts');
r.x=walker.x;r.z=walker.z-5;r.state='graze';assert.equal(life.target(walker,0,-1),r,'a rabbit straight ahead can be targeted');assert.equal(life.target(walker,1,0),null);
assert.equal(life.throwAt(r,walker,0),true);assert.equal(r.active,false);
const far=life.rabbits.find(q=>q.active)??life.rabbits[1];far.active=true;far.state='graze';far.x=walker.x;far.z=walker.z-THROW_RANGE+.5;assert.equal(life.throwAt(far,walker,.5),false,'long throws usually miss');assert.equal(far.state,'flee');
console.log('Passed clock and light, warmth, fatigue, wood, fire, cooking, boiling, snares, sleep, campfire and snare meshes, and rabbit behaviour.');
