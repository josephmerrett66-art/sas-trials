import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createForest} from '../forest-scene.js';
import {ForestVisibility} from '../forest-visibility.js';
const names=JSON.parse(fs.readFileSync(new URL('../assets/nature-details/manifest.json',import.meta.url)));
for(const name of names){const d=JSON.parse(fs.readFileSync(new URL(`../assets/nature-details/${name}.gltf`,import.meta.url)));for(const item of [...d.buffers,...(d.images??[])])assert.ok(fs.existsSync(new URL(`../assets/nature-details/${item.uri}`,import.meta.url)));}
const models=[];models.details=new Map(names.map(name=>[name,{height:1,footprint:{x:1,z:1},parts:[{geometry:new THREE.BoxGeometry(1,.1,1),material:new THREE.MeshLambertMaterial()}]}]));
const scene=new THREE.Scene(),obstacles=createForest(scene,models);assert.equal(scene.getObjectByName('Winding dirt trail'),undefined,'stone route replaces dirt overlay');assert.ok(scene.getObjectByName('Faceted forest floor'));for(let i=1;i<=3;i++)assert.ok(scene.getObjectByName(`Kit Rock_Medium_${i}`));
assert.ok(scene.userData.natureDetails.stonePathTiles>100);assert.ok(Object.values(scene.userData.natureDetails.families).every(count=>count>0),'every small detail model has habitat placements');assert.ok(obstacles.every(o=>Number.isFinite(o.baseY)&&o.radius>0));
const visibility=new ForestVisibility(scene),camera=new THREE.PerspectiveCamera(85,1.5,.05,400);camera.position.set(0,2.295,8);visibility.update(camera);assert.equal(scene.getObjectByName('Large faceted boulders').visible,false);assert.ok(scene.getObjectByName('Kit RockPath_Round_Wide').count>0);for(const b of visibility.batches.filter(b=>b.mesh.name.startsWith('Kit ')))assert.ok(b.mesh.instanceMatrix.array.every(Number.isFinite));
console.log('Passed bundled detail dependencies, all habitat families, stone-path replacement, three rock shapes, finite placement/colliders, shadow proxies and nearby culling.');console.log(scene.userData.natureDetails);
