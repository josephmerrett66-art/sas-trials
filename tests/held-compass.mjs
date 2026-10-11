import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {HeldNavigation} from '../held-navigation.js';
// Canvas drawing is irrelevant to the magnetic orientation regression.
const context=new Proxy({}, {get:(o,key)=>o[key]??(()=>{})});
globalThis.document={createElement:()=>({width:256,height:256,getContext:()=>context,addEventListener(){}})};
const camera=new THREE.PerspectiveCamera();camera.rotation.order='YXZ';
const rig=new HeldNavigation(camera,document.createElement('canvas')),north=new THREE.Vector3(0,0,-1),needle=new THREE.Vector3(),origin=new THREE.Vector3(),local=new THREE.Vector3();
const draws=[];rig.root.traverse(o=>{if(o.isMesh)draws.push(o);});assert.equal(draws.length,7,'fixed heading marker reuses existing bezel draw');
for(const yaw of [0,-Math.PI/2,Math.PI,Math.PI/2,12*Math.PI+.63])for(const pitch of [-1.1,-.4,0])for(const roll of [0,.05,-.08]){
 camera.rotation.set(pitch+.025,yaw,roll);rig.update({yaw,pitch},true);camera.updateMatrixWorld(true);
 local.copy(north).applyQuaternion(rig.compass.getWorldQuaternion(new THREE.Quaternion()).invert());local.z=0;local.normalize();
 const tip=new THREE.Vector3(0,.062,0).applyAxisAngle(new THREE.Vector3(0,0,1),rig.needle.rotation.z).normalize();assert.ok(tip.dot(local)>.99999,'red tip follows projected world north under look, sway and lean');
 rig.needle.getWorldPosition(origin);needle.set(0,.062,0);rig.needle.localToWorld(needle);needle.sub(origin).normalize();assert.ok(needle.dot(north)>.98,'needle stays north in the world');
 assert.equal(rig.dial.rotation.z,rig.needle.rotation.z,'north on the card remains under the red tip');
}
for(const [yaw,heading] of [[0,0],[-Math.PI/2,Math.PI/2],[Math.PI,Math.PI],[Math.PI/2,-Math.PI/2]]){camera.rotation.set(-1,yaw,0);rig.update({yaw,pitch:-1},true);const error=Math.atan2(Math.sin(rig.dial.rotation.z-heading),Math.cos(rig.dial.rotation.z-heading));assert.ok(Math.abs(error)<.00001,'fixed forward index reads N/E/S/W correctly');}
rig.update({yaw:0,pitch:0},false);assert.equal(rig.root.visible,false);
console.log('Passed fixed world-north needle, cardinal heading index, look/sway/lean compensation, wraparound and seven-draw budget.');
