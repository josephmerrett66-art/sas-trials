import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {FBXLoader} from '../vendor/FBXLoader.js';
import {Arsenal,loadouts} from '../arsenal.js';
import {PackWorld} from '../pack-world.js';
import {Controller} from '../controller.js';
import {Pursuer} from '../pursuer.js';

// Use the actual supplied FBX files without requiring a browser or HTTP server.
FBXLoader.prototype.loadAsync=async function(path){const data=fs.readFileSync(path);return this.parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');};
globalThis.Audio=class{play(){return Promise.resolve();}};
globalThis.fetch=async path=>({json:async()=>JSON.parse(fs.readFileSync(path,'utf8'))});
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),obstacles=[],world=new PackWorld(scene,obstacles),feel={sound(){},landed(){},phase:0},player=new Controller();scene.add(camera);
const arsenal=new Arsenal(camera,scene,feel,world);await Promise.all([world.load(),arsenal.load()]);
const pursuer=new Pursuer(scene,obstacles,feel);arsenal.pursuer=pursuer;
assert.equal(arsenal.entries.length,5);assert.equal(arsenal.root.children.length,1);assert.equal(world.targets.length,6);assert.equal(obstacles.length,6);
const tick=seconds=>{for(let i=0;i<Math.ceil(seconds*120);i++){arsenal.update(1/120,player,feel,true,false);world.update(1/120);}};
tick(1);assert.ok(arsenal.fire());assert.equal(arsenal.state.ammo,11);tick(.25);assert.ok(arsenal.reload());assert.equal(arsenal.fire(),false);tick(3.1);assert.equal(arsenal.state.ammo,12);assert.equal(arsenal.state.reserve,95);
for(let i=1;i<5;i++){arsenal.select(i);tick(2);assert.equal(arsenal.index,i);assert.equal(arsenal.root.children.length,1);assert.equal(arsenal.root.children[0],arsenal.current.model);assert.ok(arsenal.fire());tick(1.05);if(i===4){assert.equal(world.grenades.length,1);tick(2.3);assert.equal(world.grenades.length,0);}}
for(const entry of arsenal.entries){assert.ok(Object.keys(entry.actions).length);entry.model.traverse(mesh=>{if(mesh.isMesh){assert.equal(mesh.layers.mask,2);for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])assert.ok([material.color.r,material.color.g,material.color.b].every(Number.isFinite));}});}
let explosions=0;world.onExplosion=()=>explosions++;world.targets[0].damage(100);assert.ok(explosions>0);assert.ok(!obstacles.includes(world.targets[0].collider));world.targets.find(t=>t.name==='Wall').damage(100);
pursuer.hit(25);assert.equal(pursuer.health,75);pursuer.hit(100);assert.equal(pursuer.health,0);
arsenal.select(2,true);tick(1);
for(let i=0;i<120;i++)arsenal.update(1/120,player,feel,true,true);
assert.ok(arsenal.aim>.99);assert.equal(arsenal.current.model.visible,false);
for(let i=0;i<60;i++)arsenal.update(1/120,player,feel,true,false);
assert.equal(arsenal.current.model.visible,true);
arsenal.select(4,true);arsenal.state.reset();tick(.2);assert.ok(arsenal.fire());tick(.8);
assert.equal(world.grenades.length,0);assert.equal(arsenal.current.grenadeMesh.visible,true);
tick(.2);assert.equal(world.grenades.length,1);assert.equal(arsenal.current.grenadeMesh.visible,false);
tick(.7);assert.equal(arsenal.current.grenadeMesh.visible,true);assert.ok(arsenal.current.current.getClip().name.includes('Ready'));
arsenal.reset();assert.equal(arsenal.index,0);assert.equal(arsenal.state.ammo,loadouts[0].capacity);
console.log('Passed: all supplied rigs/animations, weapon switching, reload conservation, grenade throw/fuse, destructible props, damage, palette materials, render layers and reset.');

for(const entry of arsenal.entries)entry.model.traverse(mesh=>{
 if(!mesh.isMesh)return;
 assert.ok(!Array.isArray(mesh.material),'solid slots collapsed');
 assert.ok(mesh.geometry.getAttribute('color').array.every(Number.isFinite));
 if(mesh.isSkinnedMesh){assert.equal(mesh.geometry.attributes.skinIndex.count,mesh.geometry.attributes.position.count);assert.equal(mesh.geometry.attributes.skinWeight.count,mesh.geometry.attributes.position.count);}
});
const hit={point:new THREE.Vector3(0,0,-5),distance:5,object:{userData:{}}};
for(let i=0;i<120;i++)world.shotEffects(camera,'m416',hit);
world.update(.01);assert.equal(world.markMesh.count,100);assert.ok(world.markMesh.userData.decorative);
assert.ok([...world.projectilePool.groups.values()].every(group=>group.meshes.every(mesh=>mesh.count<=64&&mesh.userData.decorative)));
world.clearTransient();assert.ok([...world.projectilePool.groups.values()].every(group=>group.meshes.every(mesh=>mesh.count===0)));
console.log('Passed consolidated skin attributes, bounded instanced bullet marks/casings and pool reset.');

// Recoil still works after removing muzzle effects.
arsenal.select(1,true);tick(2);assert.ok(arsenal.fire());assert.ok(arsenal.kickPitch>0);tick(1.5);assert.ok(arsenal.kickPitch<.00001);
arsenal.select(1,true);arsenal.state.reset();tick(2);player.pitch=player.yaw=0;camera.rotation.set(0,0,0);camera.updateMatrixWorld(true);
const firstAim=new THREE.Vector3();camera.getWorldDirection(firstAim);assert.ok(arsenal.fire());assert.ok(player.pitch>0);const kickedPitch=player.pitch;
const nextAim=new THREE.Vector3();camera.getWorldDirection(nextAim);assert.ok(nextAim.y>firstAim.y,'recoil raises the crosshair aim');
tick(.12);camera.rotation.set(player.pitch,player.yaw,0);assert.ok(arsenal.fire());assert.ok(arsenal.ray.ray.direction.y>firstAim.y,'next bullet follows recoil aim');
tick(2);assert.ok(player.pitch>=kickedPitch,'visual recovery does not undo actual aim');


console.log('Passed aim recoil after muzzle flash removal.');
const survivalObstacles=[{x:-1.8,z:-3,radius:2,height:4}],survivalWorld=new PackWorld(new THREE.Scene(),survivalObstacles,{survival:true});await survivalWorld.load();assert.equal(survivalWorld.targets.length,3);assert.ok(survivalWorld.targets.every(t=>t.lootCache&&!t.explosive));const cache=survivalWorld.targets[0];assert.ok(Math.hypot(cache.x+1.8,cache.z+3)>3.4,'cache avoids forest colliders');cache.damage(1000);assert.equal(cache.health,100,'loot barrels survive shooting');
console.log('Passed three survival caches, accessible placement, no FPS walls and indestructible loot barrels.');

const knifeScene=new THREE.Scene(),knifeWorld=new PackWorld(knifeScene,[],{survival:true,knifeOnly:true,groundHeight:(x,z)=>z/50}),knife=new Arsenal(new THREE.PerspectiveCamera(),knifeScene,feel,knifeWorld,{knifeOnly:true});await Promise.all([knifeWorld.load(),knife.load()]);assert.equal(knife.entries.length,1);assert.equal(knife.current.spec.id,'knife');knife.select(4,true);assert.equal(knife.current.spec.id,'knife');assert.equal(knife.reload(),false);assert.equal(knifeWorld.projectilePool,null);assert.equal(Object.keys(knifeWorld.parts).length,0);assert.ok(knifeWorld.targets.every(t=>t.collider.baseY===t.z/50));knifeWorld.clearTransient();console.log('Passed knife-only rig, no gun switching/reloading/projectiles and elevated cache placement.');
