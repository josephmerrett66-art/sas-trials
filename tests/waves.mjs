import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {EnemyWaves} from '../enemy-waves.js';
GLTFLoader.prototype.loadAsync=async function(path){const b=fs.readFileSync(path);return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
const player={x:0,z:8,yaw:0,config:{size:1.35}},waves=new EnemyWaves(new THREE.Scene(),[],{sound(){},landed(){}},3);await waves.ready;
assert.equal(waves.wave,1);assert.equal(waves.parts.length,1);
for(const count of [2,3,4]){
 for(const enemy of waves.pool)if(enemy.health>0&&enemy.root.visible)enemy.hit(1000);
 waves.step(.1,player);assert.equal(waves.remaining,0);assert.equal(waves.wave,count-1);
 waves.step(1.9,player);while(waves.loading)await new Promise(resolve=>setTimeout(resolve,0));assert.equal(waves.wave,count);assert.equal(waves.remaining,count);assert.equal(waves.alive,Math.min(3,count));
}
assert.equal(waves.pool.length,3);assert.equal(waves.pending,1);const first=waves.first;first.hit(1000);waves.step(.1,player);assert.equal(waves.remaining,3);waves.step(2,player);assert.equal(waves.pending,0);assert.equal(waves.alive,3);
assert.notEqual(waves.pool[0].model.getObjectByName('spine_02'),waves.pool[1].model.getObjectByName('spine_02'),'clones have independent bones');assert.notEqual(waves.pool[0].model.getObjectByProperty('isSkinnedMesh',true).skeleton,waves.pool[1].model.getObjectByProperty('isSkinnedMesh',true).skeleton);
waves.playerHealth=75;waves.step(.016,player);assert.equal(waves.playerHealth,75);
waves.explode(new THREE.Vector3(first.x,0,first.z),1);assert.equal(first.health,0);
waves.reset(player);assert.equal(waves.wave,1);assert.equal(waves.playerHealth,100);assert.equal(waves.parts.length,1);assert.equal(waves.pool.filter(e=>e.root.visible).length,1);
console.log('Passed 1→2→3→4 waves, clear delay, bounded rig reuse/reinforcements, independent skeletons, shared health, explosions and reset.');
await waves.nextWave(player);for(const e of waves.pool){e.grace=1000;e.x=0;e.z=26;}waves.step(.05,player);assert.ok(Math.hypot(waves.pool[0].x-waves.pool[1].x,waves.pool[0].z-waves.pool[1].z)>0,'coincident enemies separate');waves.playerHealth=0;for(const e of waves.pool)e.hit(1000);waves.step(3,player);assert.equal(waves.wave,2,'player death prevents next wave');
console.log('Passed enemy separation and no wave advance after player death.');
