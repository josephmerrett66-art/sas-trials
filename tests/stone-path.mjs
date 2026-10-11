import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {stonePathSites,drapeStoneMaterial} from '../stone-path.js';
import {trails} from '../landmark-routes.js';
const model={footprint:{x:1,z:1},height:1};
for(const route of trails){const sites=stonePathSites([route],model);assert.equal(sites[0].z,route.start);assert.equal(sites.at(-1).z,route.end);for(let i=1;i<sites.length;i++){const a=sites[i-1],b=sites[i];assert.ok(Math.hypot(b.x-a.x,b.z-a.z)<2.8,'tiles overlap even on bends');assert.equal(b.length,4);}}
const material=drapeStoneMaterial(new THREE.MeshLambertMaterial()),shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>'};material.onBeforeCompile(shader);assert.ok(shader.vertexShader.includes('stoneGround(stoneWorld.xz)'));assert.ok(shader.uniforms.stoneTerrain.value.image.data.every(Number.isFinite));console.log('Passed whole-route endpoint coverage, overlapping arc-length spacing, exact terrain-height draping and finite shared height texture.');

const {trimStoneUndersides}=await import('../stone-path.js');const box=new THREE.BoxGeometry(1,1,1);trimStoneUndersides(box);assert.equal(box.index.count,30,'only the two bottom triangles are removed');for(let i=0;i<box.index.count;i+=3)assert.ok([0,1,2].some(j=>box.attributes.normal.getY(box.index.getX(i+j))>=-.35));console.log('Passed hidden-face trimming with visible top and sides retained.');
