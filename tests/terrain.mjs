import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {terrainHeight,WORLD_SIZE} from '../terrain.js';
import {Controller} from '../controller.js';
import {createForest} from '../forest-scene.js';
assert.ok(WORLD_SIZE**2/640**2>=5);
const scene=new THREE.Scene(),obstacles=createForest(scene),floor=scene.getObjectByName('Faceted forest floor');
const ray=new THREE.Raycaster();let lo=Infinity,hi=-Infinity;
for(let i=0;i<80;i++){const x=-300+i*7.37,z=-250+i*5.91,h=terrainHeight(x,z);lo=Math.min(lo,h);hi=Math.max(hi,h);ray.set(new THREE.Vector3(x,100,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(floor)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y-h)<.00001);}
assert.ok(hi-lo>20);assert.equal(terrainHeight(0,8),0);
const player=new Controller(terrainHeight,315);player.x=35;player.z=-100;player.y=terrainHeight(player.x,player.z);
for(let i=0;i<1200;i++){player.step(1/120,new Set(['KeyW']));assert.ok(player.grounded);assert.equal(player.y,terrainHeight(player.x,player.z));}
player.jumpBuffer=player.time+.12;player.step(1/120,new Set(['KeyW']));assert.equal(player.grounded,false);let airborne=0;for(let i=0;i<240;i++){player.step(1/120,new Set(['KeyW']));if(!player.grounded)airborne++;}assert.ok(airborne>30);assert.equal(player.grounded,true);assert.equal(player.y,terrainHeight(player.x,player.z));
assert.ok(obstacles.every(o=>Number.isFinite(o.baseY)));
console.log('Passed 5x map area, raycast/physics terrain agreement, hill range, uphill/downhill grounding and jump landing.');
for(const [x,z] of [[-680,-650],[675,630],[-480,420],[460,-540],[0,700]]){const h=terrainHeight(x,z);ray.set(new THREE.Vector3(x,100,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(floor,true)[0];assert.ok(hit,'outer terrain exists');assert.ok(Math.abs(hit.point.y-h)<.00002,'outer terrain matches collision height');}
assert.ok(obstacles.some(o=>o.x>600)&&obstacles.some(o=>o.x< -600)&&obstacles.some(o=>o.z>600)&&obstacles.some(o=>o.z< -600),'scenery spans every outer region');
console.log('Passed expanded outer terrain and scenery coverage.');
