import * as THREE from './vendor/three.module.js';

// Fit a single static shadow map to the entire playable forest, not the view camera.
export function fitForestShadows(light,scene){
 scene.updateMatrixWorld(true);
 const bounds=new THREE.Box3();
 scene.traverse(mesh=>{
  if(!mesh.isMesh||(!mesh.castShadow&&!mesh.receiveShadow))return;
  if(mesh.isInstancedMesh){mesh.computeBoundingBox();bounds.union(mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld));}
  else bounds.union(new THREE.Box3().setFromObject(mesh));
 });
 if(bounds.isEmpty())return null;
 const direction=light.position.clone().sub(light.target.position).normalize(),center=bounds.getCenter(new THREE.Vector3()),distance=bounds.getSize(new THREE.Vector3()).length()+50;
 light.target.position.copy(center);light.position.copy(center).addScaledVector(direction,distance);
 if(!light.target.parent)scene.add(light.target);
 light.updateMatrixWorld(true);light.target.updateMatrixWorld(true);
 const camera=light.shadow.camera;
 camera.position.copy(light.position);camera.lookAt(center);camera.updateMatrixWorld(true);
 const viewBounds=bounds.clone().applyMatrix4(camera.matrixWorldInverse),padding=3;
 Object.assign(camera,{left:viewBounds.min.x-padding,right:viewBounds.max.x+padding,bottom:viewBounds.min.y-padding,top:viewBounds.max.y+padding,near:Math.max(.1,-viewBounds.max.z-padding),far:-viewBounds.min.z+padding});
 camera.updateProjectionMatrix();
 light.shadow.bias=-.0001;light.shadow.normalBias=.025;
 return bounds;
}
