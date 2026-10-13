import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {ForestFloor,branchSpot,BRANCH_CHANCE,MAX_DROPPED,MAX_CARCASSES} from '../forest-floor.js';
import {FieldKit} from '../kit.js';
import {Wildlife} from '../wildlife.js';
import {snapshot,restore} from '../save-game.js';

// A small grove: every big tree either always has its branch or never does.
const trees=[];for(let i=0;i<120;i++)trees.push({x:(i%12)*7-40,z:Math.floor(i/12)*7-140,radius:.4,height:6});trees.push({x:0,z:-150,radius:.3,height:2});
const spot={},again={};let withBranch=0;
for(const t of trees){const a=branchSpot(t,spot),b=branchSpot(t,again);assert.equal(!!a,!!b);if(a){withBranch++;assert.deepEqual({...a},{...b},'the same tree always drops the same branch');assert.ok(Math.hypot(a.x-t.x,a.z-t.z)>t.radius+.8,'branches lie clear of the trunk');}}
assert.equal(branchSpot(trees.at(-1),spot),null,'saplings drop nothing');
assert.ok(withBranch>120*BRANCH_CHANCE*.6&&withBranch<120*BRANCH_CHANCE*1.4,`about ${BRANCH_CHANCE*100}% of trees have one (${withBranch})`);

// The floor shows nearby branches in one instanced draw and forgets the ones you take.
const scene=new THREE.Scene(),floor=new ForestFloor(scene,trees),player={x:0,z:-110,yaw:0,y:0};
floor.step(0,player);assert.ok(floor.spotCount>5,'branches near the player');assert.equal(floor.mesh.count,floor.spotCount);assert.equal(floor.carcassMesh.visible,false,'no rabbit draw without rabbits');
const near=floor.spots[0];player.x=near.x;player.z=near.z+1;assert.equal(floor.nearestBranch(player),near);
const kit=new FieldKit(()=>0);kit.pack();assert.equal(kit.sticks,0,'no stick to start with');
assert.equal(kit.takeBranch(),true);floor.take(near);floor.step(0,player);assert.notEqual(floor.nearestBranch(player),near,'a taken branch is gone');assert.equal(kit.branches,1);assert.match(kit.message,/Whittle it/);
const weight=kit.weight;assert.equal(kit.whittle(),true);assert.equal(kit.sticks,1);assert.equal(kit.branches,0);assert.equal(kit.weight,weight,'whittling keeps the weight');assert.equal(kit.whittle(),false,'nothing left to whittle');

// Throw: the stick leaves the bergen, flies, lands where aimed and can be picked up again.
assert.equal(kit.throwStick(),true);assert.equal(kit.sticks,0);assert.equal(kit.throwStick(),false,'one stick, one throw');
floor.launch(player.x,1.4,player.z,player.x,player.z-8,{hit:true});assert.equal(floor.flying.visible,true);let landed=null,t=0;
while(!landed&&t<2){landed=floor.step(1/60,player);t+=1/60;}assert.ok(landed&&landed.data.hit,'the flight reports its outcome on landing');assert.ok(t<.8,'a short arc');assert.equal(floor.flying.visible,false);
const lying=floor.nearestStick({x:player.x,z:player.z-8});assert.ok(lying,'the stick lies where it landed');assert.equal(kit.pickUpStick(),true);floor.pick(lying);assert.equal(floor.nearestStick({x:player.x,z:player.z-8}),null);assert.equal(kit.sticks,1);
floor.dropCarcass(player.x,player.z-2);floor.step(0,player);assert.equal(floor.carcassMesh.visible,true);const carcass=floor.nearestCarcass(player);assert.ok(carcass);assert.equal(kit.pickUpRabbit(),true);floor.pick(carcass);assert.equal(kit.raw,1);
for(let i=0;i<6;i++){floor.drop(floor.dropped,MAX_DROPPED,i,0,0);floor.dropCarcass(i,0);}assert.equal(floor.dropped.length,MAX_DROPPED,'bounded');assert.equal(floor.carcasses.length,MAX_CARCASSES,'bounded');
console.log('Passed fixed branch spots, the instanced floor, taking, whittling, the thrown stick, rabbits on the ground and bounded pools.');

// Aim: a steady throw is likelier to hit than a snatched one.
const life=new Wildlife(new THREE.Scene()),rabbit={x:0,z:-6,state:'graze',active:true};
assert.ok(life.throwChance(rabbit,{x:0,z:0},.1)>life.throwChance(rabbit,{x:0,z:0},-.1));life.kill(rabbit);assert.equal(rabbit.active,false);
console.log('Passed aim affecting the throw.');

// Saves keep taken branches, your stick and any rabbit on the ground; old saves still load.
const parts={kit,player:{x:1,z:2,yaw:0,pitch:0,stamina:100,reset(){}},clock:{hours:10},camp:{fire:null,snares:[],reset(){},syncSnares(){}},exercise:{stage:0,distance:0,elevation:0,checkpoints:[],reset(){}},gathered:new Set(),obstacles:trees,groundHeight:()=>0};
floor.reset();floor.take(near);floor.drop(floor.dropped,MAX_DROPPED,3,4,.5);floor.dropCarcass(5,6,1);
const saved=JSON.parse(JSON.stringify(snapshot({...parts,floor}))),other=new ForestFloor(new THREE.Scene(),trees);
assert.equal(restore(saved,{...parts,floor:other}),true);assert.deepEqual(other.save(),floor.save());
delete saved.floor;assert.equal(restore(saved,{...parts,floor:other}),true);assert.equal(other.taken.size,0,'a save from before branches loads with a fresh floor');
console.log('Passed saving and restoring the forest floor.');
