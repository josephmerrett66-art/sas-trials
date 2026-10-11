import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createForest} from '../forest-scene.js';
import {trailClearance} from '../landmark-routes.js';
import {ForestVisibility} from '../forest-visibility.js';
const scene=new THREE.Scene();createForest(scene);const grass=scene.getObjectByName('Dense grass clumps');
assert.equal(grass.geometry.attributes.position.count/3,216);
assert.ok(grass.count<500000,'full world population remains bounded');
grass.geometry.computeBoundingBox();assert.ok(grass.geometry.boundingBox.max.y<.45,'blades stay short');
assert.equal(grass.castShadow,false);assert.equal(grass.material.transparent,false);
const matrix=new THREE.Matrix4();
for(let i=0;i<grass.count;i++){grass.getMatrixAt(i,matrix);assert.ok(trailClearance(matrix.elements[12],matrix.elements[14])>=1.5,'grass leaves the dirt trail clear');assert.ok(matrix.elements.every(Number.isFinite));}
const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};grass.material.onBeforeCompile(shader);assert.ok(shader.fragmentShader.includes('bladeHeight'));assert.ok(!shader.fragmentShader.includes('texture2D'),'grass gradient needs no texture sample');
const visibility=new ForestVisibility(scene),camera=new THREE.PerspectiveCamera(85,1.5,.05,400);camera.position.set(0,2.295,8);visibility.update(camera);assert.ok(grass.count<2400,'only nearby grass reaches the renderer');
console.log('Passed bounded opaque grass, clear trail, finite placement, root/tip gradient and nearby instance culling.');
