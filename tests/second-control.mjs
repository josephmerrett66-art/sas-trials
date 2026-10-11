import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createForest,collideForest} from '../forest.js';
import {SECOND_CONTROL,secondControlClearing} from '../second-control.js';
import {makeCheckpoints,NavigationExercise} from '../navigation.js';
import {terrainHeight} from '../terrain.js';
const scene=new THREE.Scene(),obstacles=createForest(scene),points=makeCheckpoints(obstacles),b=points[1],exercise=new NavigationExercise(points);
assert.equal(b.grid,'H1');assert.equal(b.controlDescription,'Large boulder beside a fallen trunk, south side.');
assert(SECOND_CONTROL.log.x>SECOND_CONTROL.rock.x);assert.equal(b.x,SECOND_CONTROL.rock.x);assert(b.z>SECOND_CONTROL.rock.z);
assert.equal(obstacles.filter(o=>secondControlClearing(o.x,o.z)).length,4,'Only the landmark rock and three log colliders remain locally');
const matrix=new THREE.Matrix4();
for(const [name,feature] of [['Large faceted boulders',SECOND_CONTROL.rock],['Fallen tree logs',SECOND_CONTROL.log]]){
 const mesh=scene.getObjectByName(name);let found=0;for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);if(Math.abs(matrix.elements[12]-feature.x)<.01&&Math.abs(matrix.elements[14]-feature.z)<.01)found++;}assert.equal(found,1,'Landmark reuses its existing batch');
}
const player={...b,vx:0,vz:0,radius:.3,grounded:true,groundHeight:terrainHeight};assert.equal(exercise.interact(player),false,'B stays locked until A is registered');
Object.assign(player,points[0]);assert.equal(exercise.interact(player),true);assert.equal(exercise.current,b);
for(const pos of [{x:SECOND_CONTROL.log.x,z:SECOND_CONTROL.log.z},{x:b.x,z:SECOND_CONTROL.rock.z-6},{x:SECOND_CONTROL.rock.x-6,z:SECOND_CONTROL.rock.z},{x:SECOND_CONTROL.rock.x+6,z:SECOND_CONTROL.rock.z}]){Object.assign(player,pos,{y:terrainHeight(pos.x,pos.z)});assert.equal(exercise.interact(player),false,'Wrong feature/side cannot register B');}
Object.assign(player,b);collideForest(player,obstacles);assert(Math.hypot(player.x-b.x,player.z-b.z)<1e-8,'B is physically reachable');assert.equal(exercise.interact(player),true);assert.equal(exercise.current.code,'C');exercise.reset();assert.equal(exercise.current.code,'A');assert.equal(exercise.revealed.length,1);
console.log('Passed B landmark placement/batch reuse, clear approach, wrong feature/side rejection, ordered unlock, registration and reset.');
