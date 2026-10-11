import * as THREE from './vendor/three.module.js';
export class ProjectilePool {
 constructor(scene,models){
  this.groups=new Map();this.capacity=64;
  for(const name of ['Glock_Bullet','Glock_Bullet_Shell','M416_Bullet','M416_Bullet_Shell']){
   const model=models[name];model.updateMatrixWorld(true);const inverse=model.matrixWorld.clone().invert(),meshes=[];
   model.traverse(part=>{
    if(!part.isMesh)return;
    const geometry=part.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,part.matrixWorld));
    const mesh=new THREE.InstancedMesh(geometry,part.material,this.capacity);mesh.count=0;mesh.userData.decorative=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);meshes.push(mesh);
   });
   this.groups.set(name,{model,meshes,count:0});
  }
 }
 create(name){const object=new THREE.Object3D();object.position.copy(this.groups.get(name).model.position);object.quaternion.copy(this.groups.get(name).model.quaternion);return object;}
 sync(projectiles){
  for(const group of this.groups.values())group.count=0;
  for(const projectile of projectiles){
   const group=this.groups.get(projectile.pool);if(!group||group.count>=this.capacity)continue;
   projectile.object.updateMatrix();for(const mesh of group.meshes)mesh.setMatrixAt(group.count,projectile.object.matrix);group.count++;
  }
  for(const group of this.groups.values())for(const mesh of group.meshes){mesh.count=group.count;if(group.count){mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,group.count*16);mesh.instanceMatrix.needsUpdate=true;}}
 }
}
