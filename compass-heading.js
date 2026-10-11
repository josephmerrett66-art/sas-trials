import * as THREE from './vendor/three.module.js';
// Map north is fixed world -Z; east is +X. Reuse scratch objects on every update.
export class CompassHeading {
 constructor(){this.forward=new THREE.Vector3();this.orientation=new THREE.Quaternion();this.angle=0;this.last=0;this.valid=false;this.degrees=0;}
 update(camera){
  camera.getWorldQuaternion(this.orientation);
  this.forward.set(0,0,-1).applyQuaternion(this.orientation);
  if(this.forward.x*this.forward.x+this.forward.z*this.forward.z<1e-8)return this;
  const heading=Math.atan2(this.forward.x,-this.forward.z);
  if(this.valid)this.angle+=Math.atan2(Math.sin(heading-this.last),Math.cos(heading-this.last));else {this.angle=heading;this.valid=true;}
  this.last=heading;this.degrees=((Math.round(heading*180/Math.PI)%360)+360)%360;return this;
 }
}
