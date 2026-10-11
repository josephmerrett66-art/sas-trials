import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createForest} from '../forest-scene.js';
import {ForestVisibility} from '../forest-visibility.js';
import {fitForestShadows} from '../forest-shadows.js';
const scene=new THREE.Scene();createForest(scene);
const sun=new THREE.DirectionalLight();sun.position.set(-30,50,20);sun.castShadow=true;
scene.add(sun);const bounds=fitForestShadows(sun,scene);
const camera=sun.shadow.camera,view=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),frustum=new THREE.Frustum().setFromProjectionMatrix(view);
for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])assert.ok(frustum.containsPoint(new THREE.Vector3(x,y,z)),'all forest shadow bounds are inside light camera');
assert.ok(bounds.min.x<=-140&&bounds.max.x>=140&&bounds.min.z<=-140&&bounds.max.z>=140,'entire playable floor covered');
for(const mesh of scene.children.filter(m=>/trunks|crowns|branches|knots|roots/.test(m.name))){assert.ok(mesh.castShadow,`${mesh.name} casts shadows`);assert.ok(mesh.receiveShadow,`${mesh.name} receives shadows`);}
const visibility=new ForestVisibility(scene),viewCamera=new THREE.PerspectiveCamera(85,1.5,.05,400);viewCamera.position.set(0,2.3,8);visibility.update(viewCamera);
assert.ok(visibility.batches.some(b=>b.mesh.count<b.records.length));visibility.restoreAll();
for(const {mesh,records} of visibility.batches){assert.equal(mesh.count,records.length,'rebake includes every offscreen instance');for(let i=0;i<records.length;i++)assert.deepEqual(mesh.instanceMatrix.array.slice(i*16,i*16+16),records[i].matrix);}
visibility.update(viewCamera);assert.ok(visibility.batches.some(b=>b.mesh.count<b.records.length),'normal culling resumes after bake');
console.log('Passed whole-forest shadow coverage, casting/receiving tree parts and complete instance restoration for cached shadow rebuilds.');
