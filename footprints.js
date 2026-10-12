import * as THREE from './vendor/three.module.js';

import {terrainHeight,terrainNormal} from './terrain.js?v=big-1';
// Reuse a fixed pool so long sessions don't accumulate meshes or draw calls.
export class Footprints {
  constructor(scene,capacity=2048){
    this.capacity=capacity;this.next=0;this.distance=0;this.side=-1;this.last=null;this.count=0;
    const shape=new THREE.Shape();
    shape.moveTo(-.07,-.15);shape.lineTo(.07,-.15);shape.lineTo(.085,.07);shape.lineTo(.065,.17);shape.lineTo(-.065,.17);shape.lineTo(-.085,.07);shape.closePath();
    const geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);
    this.mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:0x424242,transparent:true,opacity:.48,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}),capacity);
    this.mesh.userData.decorative=true;this.mesh.frustumCulled=false;this.mesh.count=0;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);this.transform=new THREE.Object3D();this.normal=new THREE.Vector3();this.up=new THREE.Vector3(0,1,0);this.yaw=new THREE.Quaternion();
  }
  step(player){
    const position={x:player.x,z:player.z};
    if(!this.last){this.last=position;return;}
    const dx=position.x-this.last.x,dz=position.z-this.last.z,distance=Math.hypot(dx,dz);this.last=position;
    // Ignore teleporting, jumping and slides; only ground strides leave soles.
    if(distance>1||!player.grounded||player.slide>0){this.distance=0;return;}
    if(distance<.0001)return;
    this.distance+=distance;
    const spacing=player.state==='CROUCHED'?1.25:1.8;const size=player.config?.size??1;
    if(this.distance<spacing)return;
    this.distance%=spacing;
    const forwardX=dx/distance,forwardZ=dz/distance;
    this.transform.position.set(player.x-forwardZ*this.side*.14*size,.035,player.z+forwardX*this.side*.14*size);
    this.transform.position.y=terrainHeight(this.transform.position.x,this.transform.position.z)+.035;terrainNormal(this.transform.position.x,this.transform.position.z,this.normal);this.transform.quaternion.setFromUnitVectors(this.up,this.normal);this.yaw.setFromAxisAngle(this.up,Math.atan2(-forwardX,-forwardZ));this.transform.quaternion.multiply(this.yaw);this.transform.scale.set(size,1,size);this.transform.updateMatrix();
    this.mesh.setMatrixAt(this.next,this.transform.matrix);this.mesh.instanceMatrix.needsUpdate=true;
    this.next=(this.next+1)%this.capacity;this.count=Math.min(this.capacity,this.count+1);this.mesh.count=this.count;this.side*=-1;
  }
}
