import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {AnimatedEnemy} from '../animated-enemy.js';
GLTFLoader.prototype.loadAsync=async function(path){const b=fs.readFileSync(path);return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
const scene=new THREE.Scene(),feel={sound(){},landed(){}},enemy=new AnimatedEnemy(scene,[],feel);await enemy.ready;
assert.equal(Object.keys(enemy.actions).length,6);assert.equal(enemy.parts.length,1);assert.ok(enemy.model.getObjectByProperty('isSkinnedMesh',true));
assert.ok(fs.statSync('assets/enemy/pursuer.glb').size<1600000,'trimmed runtime asset');
const player={x:0,z:8,yaw:0};const initial=Math.hypot(enemy.x-player.x,enemy.z-player.z);
for(let i=0;i<180;i++)enemy.step(1/60,player);assert.ok(Math.hypot(enemy.x-player.x,enemy.z-player.z)<initial,'enemy closes in');
enemy.x=0;enemy.z=9;enemy.attack=0;enemy.step(.016,player);assert.equal(enemy.playerHealth,75);assert.equal(enemy.current,enemy.actions.Zombie_Scratch);
for(let i=0;i<120;i++)enemy.step(1/60,player);assert.ok(enemy.playerHealth<75,'repeated attacks');
enemy.reset();enemy.grace=0;enemy.x=0;enemy.z=2;enemy.root.position.set(0,0,2);scene.updateMatrixWorld(true);
const ray=new THREE.Raycaster(new THREE.Vector3(0,1.2,5),new THREE.Vector3(0,0,-1));assert.ok(ray.intersectObjects(enemy.parts,true).length,'capsule can be shot');
assert.ok(enemy.hit(35));assert.equal(enemy.health,65);enemy.hit(100);assert.equal(enemy.health,0);for(let i=0;i<310;i++)enemy.step(1/60,player);assert.equal(enemy.health,0,'dead enemy stays down until reset');
enemy.reset();assert.equal(enemy.playerHealth,100);assert.equal(enemy.health,100);assert.ok(enemy.root.rotation.toArray().slice(0,3).every(v=>v===0));
console.log('Passed trimmed GLB rig/animations, chase, repeated melee damage, capsule shooting, death/return and reset.');

enemy.root.visible=false;enemy.step(0,player);assert.equal(enemy.shadow.visible,false,'paused contact shadow hides');enemy.root.visible=true;enemy.step(0,player);assert.equal(enemy.shadow.visible,true);assert.equal(enemy.shadow.castShadow,false,'contact shadow uses no dynamic shadow pass');
console.log('Passed paused contact shadow visibility and no dynamic shadow pass.');

for(const size of [.7,1.35,2.2]){
 enemy.reset();enemy.step(0,{...player,config:{size}});assert.equal(enemy.root.scale.x,size);assert.equal(enemy.shadow.scale.x,size);assert.equal(enemy.radius,.32*size);
 for(let i=0;i<90;i++){enemy.mixer.update(1/60);enemy.groundPose();const sole=Math.min(...enemy.footPositions.map(p=>p.y))-enemy.soleOffset*size;assert.ok(Math.abs(sole)<1e-5,'supporting foot stays grounded');}
}
console.log('Passed live player-size scaling, collision scaling and grounded soles throughout animation.');
enemy.reset();enemy.grace=0;enemy.x=0;enemy.z=player.z+1;enemy.step(1/60,player);const attackX=enemy.x,attackZ=enemy.z;for(let i=0;i<30;i++)enemy.step(1/60,player);assert.equal(enemy.x,attackX);assert.equal(enemy.z,attackZ);assert.ok(enemy.current.time>.4,'attack continues without being restarted');
console.log('Passed stationary attack and uninterrupted attack timing.');
enemy.reset();enemy.grace=0;enemy.x=0;enemy.z=-20;enemy.step(0,player);let startZ=enemy.z;for(let i=0;i<60;i++)enemy.step(1/60,player);assert.ok(Math.abs(enemy.z-startZ)<=1.81,'walking is capped at 1.8 m/s even far away');
enemy.hit(10);const hitZ=enemy.z;for(let i=0;i<12;i++)enemy.step(1/60,player);assert.ok(enemy.z<hitZ,'surviving hit steps away from player');assert.equal(enemy.root.rotation.z,0,'surviving hit stays upright');assert.notEqual(enemy.current,enemy.actions.Hit_Knockback,'fall clip is death only');const remaining=enemy.stagger;enemy.hit(10);assert.equal(enemy.stagger,remaining);for(let i=0;i<40;i++)enemy.step(1/60,player);assert.equal(enemy.current,enemy.actions.Zombie_Walk_Fwd_Loop,'recovers into walking');enemy.hit(1000);assert.equal(enemy.current,enemy.actions.Hit_Knockback);for(let i=0;i<360;i++)enemy.step(1/60,player);assert.equal(enemy.health,0);assert.equal(enemy.current,enemy.actions.Hit_Knockback);assert.equal(enemy.current.paused,true,'fatal fall holds final pose');
console.log('Passed upright damage flinch, backward step, recovery and persistent fatal fall.');

const {terrainHeight}=await import('../terrain.js');enemy.reset();enemy.groundHeight=terrainHeight;enemy.x=32;enemy.z=-145;enemy.step(0,player);enemy.play('Zombie_Walk_Fwd_Loop');for(let i=0;i<90;i++){enemy.mixer.update(1/60);enemy.groundPose();enemy.updateShadow();const sole=Math.min(...enemy.footPositions.map(p=>p.y-terrainHeight(p.x,p.z)))-enemy.soleOffset*enemy.size;assert.ok(Math.abs(sole)<1e-5);assert.ok(Math.abs(enemy.shadow.position.y-terrainHeight(enemy.x,enemy.z)-.029)<1e-5);}console.log('Passed supporting soles and contact shadow placement on rolling terrain.');
