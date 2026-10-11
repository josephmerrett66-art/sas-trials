import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createForest,collideForest} from '../forest.js';
const scene=new THREE.Scene(),obstacles=createForest(scene);
assert.ok(scene.userData.forestStats.grassClumps>7000);
assert.ok(scene.userData.forestStats.trees>600);assert.equal(Object.keys(scene.userData.forestStats.species).length,6);assert.ok(Object.values(scene.userData.forestStats.species).every(count=>count>20));
assert.ok(scene.userData.forestStats.boulders>200);
assert.ok(scene.children.length<=30);
assert.ok(obstacles.every(o=>Number.isFinite(o.x)&&Number.isFinite(o.z)&&o.radius>0));
assert.ok(!obstacles.some(o=>Math.hypot(o.x,o.z-8)<o.radius+.3));
const paths=scene.children.filter(o=>o.name==='Winding dirt trail');assert.equal(paths.length,1);
assert.ok(scene.children.filter(o=>o.name.includes('grass')||o.name.includes('shrubs')||o.name.includes('ferns')).every(o=>o.userData.decorative));
const player={x:.5,z:0,y:0,vx:-4,vz:2};collideForest(player,[{x:0,z:0,radius:.38,height:8}]);assert.ok(Math.abs(player.x-.68)<1e-9);assert.equal(player.vx,0);assert.equal(player.vz,2);
console.log('Passed forest batching, detail population, finite colliders, spawn clearance, trail, decorative plant flags and collision.');console.log(scene.userData.forestStats,'forest mesh batches:',scene.children.length);
// Every dry branch must exist on the terrain, including narrow diagonal sections.
const {trails}=await import('../landmark-routes.js');
const {terrainHeight}=await import('../terrain.js');
const path=scene.getObjectByName('Winding dirt trail'),ray=new THREE.Raycaster(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),weights=new THREE.Vector3();
for(const route of trails)for(let z=route.start+12;z<route.end-12;z+=73){const x=route.center(z);ray.set(new THREE.Vector3(x,100,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(path,true)[0];assert.ok(hit,'dry trail branch has rendered geometry');assert.ok(Math.abs(hit.point.y-terrainHeight(x,z)-.02)<.0001,'subdivided path matches the terrain plane');const p=hit.object.geometry.attributes.position,e=hit.object.geometry.attributes.trailEdge,f=hit.face;a.fromBufferAttribute(p,f.a);b.fromBufferAttribute(p,f.b);c.fromBufferAttribute(p,f.c);THREE.Triangle.getBarycoord(hit.point,a,b,c,weights);const edge=e.getX(f.a)*weights.x+e.getX(f.b)*weights.y+e.getX(f.c)*weights.z;assert.ok(edge<-.2,'shader retains the centre of narrow and forked paths');}
console.log('Passed terrain-aligned trail branch geometry and continuous narrow-path shader fields.');
