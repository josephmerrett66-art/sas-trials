import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {ValleyRiver} from '../river.js';
import {terrainHeight,WORLD_SIZE} from '../terrain.js';
import {rivers,riverClearance,drainageStats} from '../drainage.js';
const raw=(x,z)=>{const blend=Math.min(1,Math.max(0,(Math.hypot(x,z-8)-18)/28)),smooth=blend*blend*(3-2*blend);return smooth*(11*Math.sin(x/82)*Math.cos(z/105)+7*Math.sin((x+z)/58)+4*Math.cos(x/42)*Math.sin(z/67));};
for(let z=-WORLD_SIZE/2;z<WORLD_SIZE/2;z+=5)for(let x=-WORLD_SIZE/2;x<WORLD_SIZE/2;x+=5)assert.ok(Math.abs(terrainHeight(x,z)-raw(x,z))<.00001,'river never raises or excavates original terrain');
const river=new ValleyRiver(new THREE.Scene()),ray=new THREE.Raycaster();
assert.ok(rivers.length>2&&rivers.length<=14,'bounded natural drainage streams');
for(const r of rivers)for(let i=1;i<r.points.length;i++){
 const a=r.points[i-1],b=r.points[i];assert.ok(b.y<a.y,'every drainage segment descends');assert.ok(b.catchment>=a.catchment,'catchment grows downstream');
 if(i%7)continue;const x=(a.x+b.x)/2,z=(a.z+b.z)/2,h=terrainHeight(x,z);ray.set(new THREE.Vector3(x,100,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(river.group,true)[0];assert.ok(hit,'continuous stream in existing gully');assert.ok(Math.abs(hit.point.y-h-.16)<.001,'water remains shallow over the original ground');assert.ok(riverClearance(x,z)<0,'planting excludes actual drainage');
}
for(const tile of river.group.children){const p=tile.geometry.attributes.position;for(let i=0;i<p.count;i++){const depth=p.getY(i)-terrainHeight(p.getX(i),p.getZ(i));assert.ok(depth<.3&&depth>-.03,'shore geometry stays close to existing ground; no suspended aqueduct');}}
assert.ok(river.group.children.length<85,'water tiles remain bounded');assert.ok(river.group.children.every(o=>o.userData.terrainTile));river.step(2);assert.equal(river.time.value,2);
console.log('Passed unchanged original terrain, downhill catchment drainage, shallow water alignment, actual-route planting and bounded tile culling.',drainageStats);
