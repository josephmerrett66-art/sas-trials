import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createForest} from '../forest.js';
import {flowerPatchGeometry,broadleafGeometry,refineConifer,flowerSites} from '../woodland-polish.js';
import {ForestVisibility} from '../forest-visibility.js';
import {firstControlClearing} from '../first-control.js';
import {secondControlClearing} from '../second-control.js';
import {controlLandmarkClearing} from '../control-landmarks.js';
import {terrainHeight} from '../terrain.js';
const sites=flowerSites();assert.deepEqual(sites,flowerSites(),'Reproducible patches');assert(sites.length>500&&sites.length<700);const flower=flowerPatchGeometry(),broadleaf=broadleafGeometry(),cone=refineConifer(new THREE.ConeGeometry(1,1,7,3));
for(const geometry of [flower,broadleaf,cone]){assert(geometry.attributes.position.array.every(Number.isFinite));assert(geometry.attributes.normal.array.every(Number.isFinite));assert(geometry.attributes.position.count/3<180,'Bounded shared detail geometry');}
assert(flower.attributes.color,'Petal/stem colours share one geometry');assert(cone.boundingSphere.radius>1,'Needle fans refine the outer silhouette');
const scene=new THREE.Scene();createForest(scene);const mesh=scene.getObjectByName('Small woodland wildflower patches');assert(mesh.isInstancedMesh&&mesh.userData.decorative);assert(mesh.receiveShadow&&!mesh.castShadow);assert.equal(mesh.material.userData.surface,'foliage','Use existing wind/detail hooks');
const matrix=new THREE.Matrix4();let nearStart=0;
for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const x=matrix.elements[12],z=matrix.elements[14];assert(!firstControlClearing(x,z)&&!secondControlClearing(x,z)&&!controlLandmarkClearing(x,z),'Keep checkpoint searches clear');assert(Math.abs(matrix.elements[13]-(terrainHeight(x,z)+.015))<.0001);if(Math.hypot(x,z-12)<30)nearStart++;}
assert(nearStart>=2,'Initial walk includes small flower groups');
const only=new THREE.Scene();only.add(mesh);const visibility=new ForestVisibility(only,{maxDistance:92});assert.equal(visibility.batches[0].range,28,'Bound flower rendering to nearby plants');const record=visibility.batches[0].records[0],camera=new THREE.PerspectiveCamera(65,1.7,.05,900);camera.position.set(record.x,terrainHeight(record.x,record.z)+1.7,record.z+3);camera.lookAt(record.x,terrainHeight(record.x,record.z)+.2,record.z);camera.updateMatrixWorld();visibility.update(camera);assert(mesh.count>0);camera.position.set(10000,2,10000);camera.updateMatrixWorld();visibility.update(camera);assert.equal(mesh.count,0,'Distant flowers are culled');
console.log('Passed small deterministic flower patches, bounded leaf/needle geometry, terrain placement, checkpoint clearing, wind/shadow reuse and nearby culling.');
