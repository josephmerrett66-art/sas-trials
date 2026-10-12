import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createForest} from '../forest.js';
import {ForestVisibility} from '../forest-visibility.js';
import {bakeForestShadows,forestShadowChunk} from '../cached-forest-shadows.js';
const filtered=forestShadowChunk.split('#elif defined( SHADOWMAP_TYPE_PCF_SOFT )')[1].split('#elif defined( SHADOWMAP_TYPE_VSM )')[0];assert.equal((filtered.match(/texture2DCompare\(/g)||[]).length,4,'Four-sample filter is installed');
const scene=new THREE.Scene();createForest(scene);const sun=new THREE.DirectionalLight();sun.position.set(-30,50,20);scene.add(sun);const visibility=new ForestVisibility(scene,{maxDistance:92});
const camera=new THREE.PerspectiveCamera(65,1.7,.05,900);camera.position.set(0,2,12);camera.lookAt(0,2,0);camera.updateMatrixWorld();visibility.update(camera);assert(visibility.batches.some(b=>b.mesh.count<b.records.length));
let renders=0,currentTarget=null;const previousTarget={name:'Existing render target'};currentTarget=previousTarget;
const renderer={capabilities:{maxTextureSize:8192},shadowMap:{enabled:false,autoUpdate:true,needsUpdate:false},getRenderTarget:()=>currentTarget,setRenderTarget:target=>currentTarget=target,render(s,c){
 renders++;assert.equal(s,scene);assert(c.isCamera);assert.equal(currentTarget.width,1);assert.equal(currentTarget.height,1);assert(renderer.shadowMap.needsUpdate&&sun.shadow.needsUpdate);
 for(const {mesh,records} of visibility.batches)assert.equal(mesh.count,records.length,'All offscreen instances are restored before the bake');
 renderer.shadowMap.needsUpdate=false;sun.shadow.needsUpdate=false;
}};
const lightsBefore=[];scene.traverse(o=>{if(o.isLight)lightsBefore.push(o);});const stats=bakeForestShadows(renderer,scene,sun,visibility);assert.equal(renders,1);assert.equal(currentTarget,previousTarget);assert.equal(stats.updates,1);assert(stats.cached);assert.equal(stats.mapSize,4096);assert.equal(renderer.shadowMap.autoUpdate,false);assert.equal(sun.shadow.autoUpdate,false);assert.equal(renderer.shadowMap.needsUpdate,false);assert.equal(sun.shadow.needsUpdate,false);assert.equal(renderer.shadowMap.type,THREE.PCFSoftShadowMap);
const area=scene.userData.forestStream.loadedBounds;assert(stats.worldCoverage.minX<=area.minX&&stats.worldCoverage.maxX>=area.maxX&&stats.worldCoverage.minZ<=area.minZ&&stats.worldCoverage.maxZ>=area.maxZ&&area.maxX-area.minX>=320,'Every streamed chunk around the player is covered');
for(const mesh of scene.children.filter(m=>/trunks|crowns|branches|knots|roots|boulders|pebbles/.test(m.name))){assert(mesh.castShadow,`${mesh.name} casts`);assert(mesh.receiveShadow,`${mesh.name} receives`);}
const lightsAfter=[];scene.traverse(o=>{if(o.isLight)lightsAfter.push(o);});assert.deepEqual(lightsAfter,lightsBefore,'Reuse the existing sun');
visibility.update(camera);assert(visibility.batches.some(b=>b.mesh.count<b.records.length),'Normal culling resumes after the cached bake');assert.equal(renders,1,'Camera updates do not rebuild shadows');
console.log('Passed whole-world cached sunlight coverage, one bake with complete casters, tree/rock casting and receiving, shared sun, target restoration and normal culling.');
