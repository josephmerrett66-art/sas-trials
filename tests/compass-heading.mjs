import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {CompassHeading} from '../compass-heading.js';
const camera=new THREE.PerspectiveCamera();camera.rotation.order='YXZ';const heading=new CompassHeading();
const directions=[[0,0],[45,45],[90,90],[135,135],[180,180],[225,225],[270,270],[315,315]];
const epsilon=(a,b)=>assert(Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))<1e-8);
for(const [yaw,degrees] of directions)for(const pitch of [-1.3,0,1.3])for(const roll of [-.2,0,.2]){
 camera.rotation.set(pitch,-yaw*Math.PI/180,roll);heading.update(camera);assert.equal(heading.degrees,degrees);epsilon(heading.angle,yaw*Math.PI/180);
 // Card's N / red tip: top, left, bottom, right at N/E/S/W.
 const x=-Math.sin(heading.angle),y=Math.cos(heading.angle);epsilon(Math.atan2(-x,y),yaw*Math.PI/180);
 if(degrees%90===0){const expected=[[0,1],[-1,0],[0,-1],[1,0]][degrees/90];assert(Math.abs(x-expected[0])<1e-8&&Math.abs(y-expected[1])<1e-8);}
}
for(const sign of [-1,1]){
 camera.rotation.set(0,0,0);const spin=new CompassHeading();spin.update(camera);let previous=spin.angle;
 for(let degrees=1;degrees<=1080;degrees++){camera.rotation.y=-sign*degrees*Math.PI/180;spin.update(camera);assert(Math.abs(spin.angle-previous-sign*Math.PI/180)<1e-8,'Full rotations never jump at the seam');previous=spin.angle;}
 assert(Math.abs(spin.angle-sign*6*Math.PI)<1e-8);
}
camera.rotation.set(0,-359*Math.PI/180,0);const seam=new CompassHeading();seam.update(camera);const before=seam.angle;camera.rotation.y=-Math.PI/180;seam.update(camera);assert(Math.abs(seam.angle-before-2*Math.PI/180)<1e-8,'359 to 1 takes shortest distance');
const last=seam.angle;
for(const pitch of [Math.PI/2,-Math.PI/2])for(const yaw of [0,1,2,3]){camera.rotation.set(pitch,yaw,0);seam.update(camera);assert.equal(seam.angle,last,'Vertical look preserves last valid heading');}
camera.rotation.set(.2,-Math.PI/2,.1);seam.update(camera);assert.equal(seam.degrees,90,'Returns to valid horizontal heading');
const forward=seam.forward,orientation=seam.orientation;seam.update(camera);assert.strictEqual(seam.forward,forward);assert.strictEqual(seam.orientation,orientation);
// Parent rotation is part of world camera heading.
const parent=new THREE.Group();parent.rotation.y=-Math.PI/2;parent.add(camera);camera.rotation.set(0,0,0);seam.update(camera);assert.equal(seam.degrees,90);
console.log('Passed cardinal/intermediate directions, three full rotations both ways, 359/0 shortest crossing, vertical look retention, roll independence, world heading and object reuse.');
