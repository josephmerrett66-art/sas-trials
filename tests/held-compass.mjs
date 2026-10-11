import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FBXLoader} from '../vendor/FBXLoader.js';
FBXLoader.prototype.loadAsync=async function(path){const data=fs.readFileSync(path);return this.parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');};
import * as THREE from '../vendor/three.module.js';
import {HeldNavigation} from '../held-navigation.js';
// Canvas drawing is irrelevant to the magnetic orientation regression.
const context=new Proxy({}, {get:(o,key)=>o[key]??(()=>{})});
globalThis.document={createElement:()=>({width:256,height:256,getContext:()=>context,addEventListener(){}})};
const camera=new THREE.PerspectiveCamera(85,1200/769,.05,900);camera.rotation.order='YXZ';
const rig=new HeldNavigation(camera,document.createElement('canvas')),north=new THREE.Vector3(0,0,-1),needle=new THREE.Vector3(),origin=new THREE.Vector3(),local=new THREE.Vector3();
await rig.ready;
const draws=[];rig.root.traverse(o=>{if(o.isMesh)draws.push(o);});assert.equal(draws.length,6,'original arms use one shared-material draw, equipment uses five');
for(const yaw of [0,-Math.PI/2,Math.PI,Math.PI/2,12*Math.PI+.63])for(const pitch of [-1.1,-.4,0])for(const roll of [0,.05,-.08]){
 camera.rotation.set(pitch+.025,yaw,roll);rig.update({yaw,pitch},true);camera.updateMatrixWorld(true);
 local.copy(north).applyQuaternion(rig.compass.getWorldQuaternion(new THREE.Quaternion()).invert());local.z=0;local.normalize();
 const tip=new THREE.Vector3(0,.062,0).applyAxisAngle(new THREE.Vector3(0,0,1),rig.needle.rotation.z).normalize();assert.ok(tip.dot(local)>.99999,'red tip follows projected world north under look, sway and lean');
 rig.needle.getWorldPosition(origin);needle.set(0,.062,0);rig.needle.localToWorld(needle);needle.sub(origin).normalize();assert.ok(needle.dot(north)>.98,'needle stays north in the world');
 assert.equal(rig.dial.rotation.z,rig.needle.rotation.z,'north on the card remains under the red tip');
}
for(const [yaw,heading] of [[0,0],[-Math.PI/2,Math.PI/2],[Math.PI,Math.PI],[Math.PI/2,-Math.PI/2]]){camera.rotation.set(-1,yaw,0);rig.update({yaw,pitch:-1},true);const error=Math.atan2(Math.sin(rig.dial.rotation.z-heading),Math.cos(rig.dial.rotation.z-heading));assert.ok(Math.abs(error)<.00001,'fixed forward index reads N/E/S/W correctly');}
rig.update({yaw:0,pitch:0},false);assert.equal(rig.root.visible,false);
console.log('Passed fixed world-north needle, cardinal heading index, look/sway/lean compensation, wraparound and six-draw budget.');

const player={yaw:0,pitch:0,vx:0,vz:0,grounded:true,slide:0,state:'GROUNDED',config:{walk:6,sprint:9.5}},feel={dip:0};
assert.equal(rig.arms.mesh.geometry.attributes.position.count,1608,'reuse the original FBX arms geometry');
const meshList=[];rig.arms.model.traverse(o=>{if(o.isMesh)meshList.push(o);});assert.deepEqual(meshList.map(o=>o.name),['Arms_Mesh'],'weapons are absent from the navigation rig');
const geometry=rig.arms.mesh.geometry,material=rig.arms.mesh.material;
rig.update(player,true,1/60,feel,true);const idleHeight=rig.map.position.y;
player.vz=-9.5;player.state='SPRINTING';
let maxProjected=-Infinity;
for(let i=0;i<120;i++){
 rig.update(player,true,1/60,feel,true);camera.rotation.set(0,0,0);camera.updateMatrixWorld(true);
 const vertex=new THREE.Vector3();for(let j=0;j<rig.map.children[0].geometry.attributes.position.count;j++){
  vertex.fromBufferAttribute(rig.map.children[0].geometry.attributes.position,j);rig.map.localToWorld(vertex);vertex.project(camera);maxProjected=Math.max(maxProjected,vertex.y);
 }
}
assert.ok(maxProjected<-.65,'chart stays below the useful forward view throughout the running cycle');
assert.equal(rig.arms.current,rig.arms.actions.Run,'sprint selects the original gun running clip');
assert.ok(rig.map.position.y<idleHeight-.1,'running lowers the held chart farther');
// Every chart vertex remains at the bottom of (or beneath) the forward viewport.
for(let i=0;i<rig.map.children[0].geometry.attributes.position.count;i++){
 const v=new THREE.Vector3().fromBufferAttribute(rig.map.children[0].geometry.attributes.position,i);rig.map.localToWorld(v);v.project(camera);assert.ok(v.y<-.65,'forward-running chart is unreadable below the main view');
}
player.pitch=-1.05;camera.rotation.x=player.pitch;rig.update(player,true,1/60,feel,true);camera.updateMatrixWorld(true);
const centre=rig.map.getWorldPosition(new THREE.Vector3()).project(camera);assert.ok(Math.abs(centre.x)<.6&&Math.abs(centre.y)<.6,'look down brings the chart back into readable view');
player.pitch=0;camera.rotation.set(0,0,0);camera.fov=85;camera.updateProjectionMatrix();
rig.update(player,false,1/60,feel,true);assert.equal(rig.root.visible,true,'unarmed running keeps original arms visible');assert.equal(rig.map.visible,false);assert.equal(rig.compass.visible,false);
for(let i=0;i<60;i++)rig.update(player,false,1/60,feel,true);
camera.updateMatrixWorld(true);rig.arms.mesh.skeleton.update();
let visibleVertices=0;const armVertex=new THREE.Vector3();for(let i=0;i<geometry.attributes.position.count;i++){rig.arms.mesh.getVertexPosition(i,armVertex);rig.arms.mesh.localToWorld(armVertex);armVertex.project(camera);if(armVertex.z<1&&Math.abs(armVertex.x)<1&&Math.abs(armVertex.y)<1)visibleVertices++;}
assert.ok(visibleVertices>50,'running arms are visible at the lower edges when equipment is stowed');
assert.strictEqual(rig.arms.mesh.geometry,geometry);assert.strictEqual(rig.arms.mesh.material,material);
const time=rig.arms.mixer.time;rig.update(player,true,0,feel,false);assert.equal(rig.arms.mixer.time,time,'pause does not advance the running clip');
console.log('Passed original gun-arm reuse without weapons, native running clip, low running chart, look-down inspection, stowed arms and paused/reused animation.');
