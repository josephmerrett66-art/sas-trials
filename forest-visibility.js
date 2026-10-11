import * as THREE from './vendor/three.module.js';
export class ForestVisibility {
 constructor(scene,{maxDistance=Infinity}={}){
  this.maxDistance=maxDistance;this.terrainTiles=[];scene.traverse(mesh=>{if(mesh.userData.terrainTile)this.terrainTiles.push(mesh);});
  this.previousPosition=new THREE.Vector3(Infinity,Infinity,Infinity);this.previousRotation=new THREE.Euler();this.previousFov=0;this.previousAspect=0;this.frustum=new THREE.Frustum();this.view=new THREE.Matrix4();this.matrix=new THREE.Matrix4();this.projection=new THREE.Matrix4();
  this.batches=scene.children.filter(mesh=>mesh.isInstancedMesh&&mesh.name).map(mesh=>{
   mesh.geometry.computeBoundingSphere();
   const range=/wildflower/.test(mesh.name)?28:/grass/.test(mesh.name)?38:/pebbles|knots/.test(mesh.name)?38:/shrubs|ferns|roots|branches/.test(mesh.name)?65:/clouds|mountain/.test(mesh.name)?900:145;
   const records=[];
   for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,this.matrix);const sphere=mesh.geometry.boundingSphere.clone().applyMatrix4(this.matrix);sphere.radius+=.35;
    records.push({id:i,matrix:new Float32Array(this.matrix.elements),color:mesh.instanceColor?mesh.instanceColor.array.slice(i*3,i*3+3):null,sphere,x:this.matrix.elements[12],z:this.matrix.elements[14]});
   }
   mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);if(mesh.instanceColor)mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
   const cells=new Map();
   for(const record of records){
    const key=Math.floor(record.x/24)+':'+Math.floor(record.z/24);
    if(!cells.has(key))cells.set(key,{records:[],bounds:new THREE.Box3()});
    const cell=cells.get(key);cell.records.push(record);
    const center=record.sphere.center,radius=record.sphere.radius;
    cell.bounds.expandByPoint(new THREE.Vector3(center.x-radius,center.y-radius,center.z-radius));cell.bounds.expandByPoint(new THREE.Vector3(center.x+radius,center.y+radius,center.z+radius));
   }
   return {mesh,records,range,cells:[...cells.values()],selection:new Int32Array(records.length).fill(-1),previousCount:-1};
  });
 }
 restoreAll(){
  // Shadow rebuilds must include offscreen trees, regardless of the last camera cull.
  for(const batch of this.batches){const {mesh,records}=batch;for(let i=0;i<records.length;i++){mesh.instanceMatrix.array.set(records[i].matrix,i*16);if(records[i].color)mesh.instanceColor.array.set(records[i].color,i*3);}mesh.count=records.length;mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor){mesh.instanceColor.clearUpdateRanges();mesh.instanceColor.needsUpdate=true;}batch.previousCount=-1;batch.selection.fill(-1);}
  this.previousPosition.set(Infinity,Infinity,Infinity);
 }
 update(camera,matrixReady=false){
  if(camera.position.distanceToSquared(this.previousPosition)<.16&&Math.abs(camera.rotation.y-this.previousRotation.y)<.04&&Math.abs(camera.rotation.x-this.previousRotation.x)<.04&&Math.abs(camera.rotation.z-this.previousRotation.z)<.04&&Math.abs(camera.fov-this.previousFov)<.5&&Math.abs(camera.aspect-this.previousAspect)<.001)return;
  this.previousPosition.copy(camera.position);this.previousRotation.copy(camera.rotation);this.previousFov=camera.fov;this.previousAspect=camera.aspect;
  if(!matrixReady)camera.updateMatrixWorld();this.view.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);// A slightly wider culling frustum prevents edge popping between small updates.
  const projection=this.projection.copy(camera.projectionMatrix);projection.elements[0]*=.94;projection.elements[5]*=.94;this.view.multiplyMatrices(projection,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.view);
  for(const mesh of this.terrainTiles){const b=mesh.geometry.boundingBox,dx=Math.max(b.min.x-camera.position.x,0,camera.position.x-b.max.x),dz=Math.max(b.min.z-camera.position.z,0,camera.position.z-b.max.z);mesh.visible=dx*dx+dz*dz<this.maxDistance*this.maxDistance&&this.frustum.intersectsBox(b);}
  for(const batch of this.batches){
   const {mesh,cells,range,selection}=batch;if(!mesh.visible)continue;let count=0,changed=false;const limit=range*range,visibleRange=Math.min(range,this.maxDistance);
   for(const cell of cells){
    if(camera.position.x<cell.bounds.min.x-visibleRange||camera.position.x>cell.bounds.max.x+visibleRange||camera.position.z<cell.bounds.min.z-visibleRange||camera.position.z>cell.bounds.max.z+visibleRange||!this.frustum.intersectsBox(cell.bounds))continue;
    for(const record of cell.records){
    const dx=record.x-camera.position.x,dz=record.z-camera.position.z;
    if(dx*dx+dz*dz>Math.min(limit,(this.maxDistance+record.sphere.radius)**2)||!this.frustum.intersectsSphere(record.sphere))continue;
    if(selection[count]!==record.id){changed=true;selection[count]=record.id;mesh.instanceMatrix.array.set(record.matrix,count*16);if(record.color)mesh.instanceColor.array.set(record.color,count*3);}
    count++;
    }
   }
   mesh.count=count;if(!changed&&count===batch.previousCount)continue;batch.previousCount=count;mesh.instanceMatrix.clearUpdateRanges();if(count)mesh.instanceMatrix.addUpdateRange(0,count*16);mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor){mesh.instanceColor.clearUpdateRanges();if(count)mesh.instanceColor.addUpdateRange(0,count*3);mesh.instanceColor.needsUpdate=true;}
  }
 }
}
