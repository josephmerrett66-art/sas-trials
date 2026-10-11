import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createForest,collideForest} from '../forest.js';
import {CONTROL_LANDMARKS,controlLandmarkClearing} from '../control-landmarks.js';
import {makeCheckpoints,NavigationExercise} from '../navigation.js';
import {ForestVisibility} from '../forest-visibility.js';
import {terrainHeight} from '../terrain.js';
const scene=new THREE.Scene(),obstacles=createForest(scene),points=makeCheckpoints(obstacles),exercise=new NavigationExercise(points),matrix=new THREE.Matrix4();
const player={vx:0,vz:0,radius:.3,grounded:true,groundHeight:terrainHeight};
for(const point of points){
 assert(point.controlDescription&&point.description.length>100,'Every assignment explains its feature and approach');
 Object.assign(player,point);const x=player.x,z=player.z;collideForest(player,obstacles);assert(Math.hypot(player.x-x,player.z-z)<1e-8,`Reachable post ${point.code}`);
 assert(obstacles.every(o=>Math.hypot(point.x-o.x,point.z-o.z)>o.radius+1.3),`Safe clearance at ${point.code}`);
 assert.equal(exercise.current,point);assert.equal(exercise.interact(player),true);assert.equal(exercise.revealed.length,Math.min(exercise.stage+1,8));
}
assert(exercise.complete);exercise.reset();assert.equal(exercise.revealed.length,1);
const landmarkMeshes=CONTROL_LANDMARKS.map(c=>scene.getObjectByName(c.name)),wreck=scene.getObjectByName('Burned-out rusted car');assert.equal(new Set(landmarkMeshes.map(m=>m.material)).size,1);assert.equal(landmarkMeshes[0].material,wreck.material,'Seven unique landmarks share one material');
const isolated=new THREE.Scene();let triangleTotal=0;
for(const [i,control] of CONTROL_LANDMARKS.entries()){
 const mesh=landmarkMeshes[i],point=points[i+2];assert(mesh?.isInstancedMesh);assert.equal(mesh.count,1);assert.equal(mesh.geometry.groups.length,0);assert(!mesh.castShadow&&!mesh.receiveShadow);assert.equal(scene.children.filter(m=>m.name===control.name).length,1);
 assert(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite));assert(mesh.geometry.attributes.color);const triangles=mesh.geometry.attributes.position.count/3;assert(triangles<1500);triangleTotal+=triangles;
 mesh.getMatrixAt(0,matrix);assert(Math.abs(matrix.elements[12]-control.feature.x)<.01);assert(Math.abs(matrix.elements[14]-control.feature.z)<.01);
 exercise.stage=i+2;Object.assign(player,{x:control.feature.x-(point.x-control.feature.x),z:control.feature.z-(point.z-control.feature.z)});player.y=terrainHeight(player.x,player.z);assert.equal(exercise.interact(player),false,`Wrong side of ${control.name}`);
 isolated.add(mesh);
}
assert(triangleTotal<5000);const visibility=new ForestVisibility(isolated,{maxDistance:92}),camera=new THREE.PerspectiveCamera(65,1.7,.05,900);
for(const c of CONTROL_LANDMARKS){camera.position.set(c.post.x+7,terrainHeight(c.post.x+7,c.post.z+8)+1.7,c.post.z+8);camera.lookAt(c.feature.x,terrainHeight(c.feature.x,c.feature.z)+1,c.feature.z);camera.updateMatrixWorld();visibility.update(camera);assert.equal(isolated.getObjectByName(c.name).count,1);assert.equal(landmarkMeshes.filter(m=>m.count>0).length,1,'Only one additional landmark draw is active nearby');}
camera.position.set(0,2,0);camera.lookAt(0,2,-10);camera.updateMatrixWorld();visibility.update(camera);assert(landmarkMeshes.every(m=>m.count===0),'All new landmarks are culled on the standard start route');
console.log('Passed full circuit/reveal/reset, exact-side clues, accessible posts, unique single-draw landmarks, shared material, geometry budgets and fog culling.');console.log('New landmark triangles:',triangleTotal);
