import * as THREE from './vendor/three.module.js';

// Range and fog culling for every instanced batch. A batch draws from "sources": blocks of
// original instance matrices with per-cell bounds. Static meshes have one source captured
// at construction; streamed forest chunks add and remove sources as the player travels.
// Visible instances are packed into the mesh each update, writing only slots that changed.
const CELL=24;
// Shared across module copies so selection ids never collide between sources.
const ids=globalThis.__forestSourceIds??={next:1};
const rangeFor=mesh=>mesh.userData.visibilityRange??(/wildflower/.test(mesh.name)?28:/grass/.test(mesh.name)?38:/pebbles|knots/.test(mesh.name)?38:/shrubs|ferns|roots|branches/.test(mesh.name)?65:/clouds|mountain/.test(mesh.name)?900:145);

// Pack instances into a source: matrices, colours, culling spheres and 24 m cells.
const packMatrix=new THREE.Matrix4(),packSphere=new THREE.Sphere();
// As a generator it yields every few hundred instances, so streaming can spread the work.
export function makeSource(matrices,colors,count,geometry){const steps=makeSourceSteps(matrices,colors,count,geometry);let r;do r=steps.next();while(!r.done);return r.value;}
export function* makeSourceSteps(matrices,colors,count,geometry){
 if(!geometry.boundingSphere)geometry.computeBoundingSphere();
 const base=geometry.boundingSphere,spheres=new Float32Array(count*4),cellOf=new Int32Array(count),cells=new Map();
 for(let i=0;i<count;i++){packMatrix.fromArray(matrices,i*16);packSphere.copy(base).applyMatrix4(packMatrix);const o=i*4;spheres[o]=packSphere.center.x;spheres[o+1]=packSphere.center.y;spheres[o+2]=packSphere.center.z;spheres[o+3]=packSphere.radius+.35;if(i%600===599)yield 'source';
  const key=(Math.floor(matrices[i*16+12]/CELL)+512)*4096+Math.floor(matrices[i*16+14]/CELL)+512;cellOf[i]=key;cells.set(key,(cells.get(key)??0)+1);}
 // Reorder instances cell by cell so each cell is one contiguous run.
 const runs=[],start=new Map();let k=0;for(const [key,n] of cells){start.set(key,k);runs.push({start:k,end:k+n,bounds:new THREE.Box3(new THREE.Vector3(Infinity,Infinity,Infinity),new THREE.Vector3(-Infinity,-Infinity,-Infinity))});k+=n;}
 const runOf=new Map();let n=0;for(const key of cells.keys())runOf.set(key,runs[n++]);
 const sortedM=new Float32Array(count*16),sortedC=colors?new Float32Array(count*3):null,sortedS=new Float32Array(count*4);
 for(let i=0;i<count;i++){const key=cellOf[i],j=start.get(key);start.set(key,j+1);sortedM.set(matrices.subarray(i*16,i*16+16),j*16);if(colors)sortedC.set(colors.subarray(i*3,i*3+3),j*3);sortedS.set(spheres.subarray(i*4,i*4+4),j*4);
  const b=runOf.get(key).bounds,o=i*4,r=spheres[o+3];b.min.x=Math.min(b.min.x,spheres[o]-r);b.min.y=Math.min(b.min.y,spheres[o+1]-r);b.min.z=Math.min(b.min.z,spheres[o+2]-r);b.max.x=Math.max(b.max.x,spheres[o]+r);b.max.y=Math.max(b.max.y,spheres[o+1]+r);b.max.z=Math.max(b.max.z,spheres[o+2]+r);if(i%1500===1499)yield 'source';}
 const base0=ids.next;ids.next+=count+1;
 return {matrices:sortedM,colors:sortedC,spheres:sortedS,count,cells:runs,base:base0};
}

export class ForestVisibility {
 constructor(scene,{maxDistance=Infinity}={}){
  this.scene=scene;this.shadowOnly=scene.children.filter(mesh=>mesh.userData.shadowOnly);
  this.maxDistance=maxDistance;this.terrainTiles=[];scene.traverse(mesh=>{if(mesh.userData.terrainTile)this.terrainTiles.push(mesh);});
  this.previousPosition=new THREE.Vector3(Infinity,Infinity,Infinity);this.previousRotation=new THREE.Euler();this.previousFov=0;this.previousAspect=0;this.frustum=new THREE.Frustum();this.view=new THREE.Matrix4();this.projection=new THREE.Matrix4();this.sphere=new THREE.Sphere();
  this.batches=[];this.byMesh=new Map();
  for(const mesh of scene.children)if(mesh.isInstancedMesh&&mesh.name&&!(mesh.userData.shadowOnly&&!mesh.userData.streamed))this.track(mesh);
  // Shadow-only proxies are also tracked so a bake can restore them, but never drawn.
  for(const mesh of this.shadowOnly)if(!this.byMesh.has(mesh))this.track(mesh);
  scene.userData.forestStream?.attach(this);
 }
 track(mesh){
  const batch={mesh,range:rangeFor(mesh),sources:new Map(),selection:new Float64Array(Math.max(1,mesh.instanceMatrix.count)).fill(-1),previousCount:-1,shadowOnly:!!mesh.userData.shadowOnly};
  if(!mesh.userData.streamed&&mesh.count){const colors=mesh.instanceColor?mesh.instanceColor.array.slice(0,mesh.count*3):null;batch.sources.set('static',makeSource(mesh.instanceMatrix.array.slice(0,mesh.count*16),colors,mesh.count,mesh.geometry));}
  // Every loaded instance in draw order, for inspection and tests (allocates; never per frame).
  Object.defineProperty(batch,'records',{get:()=>{const out=[];for(const s of batch.sources.values())for(let i=0;i<s.count;i++)out.push({matrix:s.matrices.slice(i*16,i*16+16),x:s.matrices[i*16+12],z:s.matrices[i*16+14],sphere:new THREE.Sphere(new THREE.Vector3(s.spheres[i*4],s.spheres[i*4+1],s.spheres[i*4+2]),s.spheres[i*4+3])});return out;}});
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);if(mesh.instanceColor)mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  this.batches.push(batch);this.byMesh.set(mesh,batch);return batch;
 }
 batchFor(mesh){return this.byMesh.get(mesh)??this.track(mesh);}
 // Total instances held by a batch (all loaded chunks), whether or not visible.
 static total(batch){let n=0;for(const s of batch.sources.values())n+=s.count;return n;}
 // Streamed chunks: sources per batch, plus their terrain tiles.
 addSource(mesh,key,source){const batch=this.batchFor(mesh);batch.sources.set(key,source);if(source.colors&&!mesh.instanceColor){batch.colored=true;this.ensureCapacity(batch,ForestVisibility.total(batch),true);}else this.ensureCapacity(batch,ForestVisibility.total(batch));this.invalidate();}
 removeSource(mesh,key){const batch=this.byMesh.get(mesh);if(batch&&batch.sources.delete(key))this.invalidate();}
 addTile(mesh){this.terrainTiles.push(mesh);this.invalidate();}
 removeTile(mesh){const i=this.terrainTiles.indexOf(mesh);if(i>=0)this.terrainTiles.splice(i,1);}
 invalidate(){this.previousPosition.set(Infinity,Infinity,Infinity);}
 // Instance buffers grow (doubling) to hold every loaded instance; the material is reused.
 ensureCapacity(batch,count,force=false){
  const mesh=batch.mesh;if(!force&&mesh.instanceMatrix.count>=count)return;
  let size=Math.max(64,mesh.instanceMatrix.count);while(size<count)size*=2;
  const matrix=new THREE.InstancedBufferAttribute(new Float32Array(size*16),16);matrix.setUsage(THREE.DynamicDrawUsage);mesh.instanceMatrix=matrix;
  if(mesh.instanceColor||batch.colored){const color=new THREE.InstancedBufferAttribute(new Float32Array(size*3).fill(1),3);color.setUsage(THREE.DynamicDrawUsage);mesh.instanceColor=color;}
  batch.selection=new Float64Array(size).fill(-1);batch.previousCount=-1;mesh.count=0;
 }
 restoreAll(){
  for(const mesh of this.shadowOnly)mesh.visible=true;
  // Shadow rebuilds must include offscreen casters, regardless of the last camera cull.
  for(const batch of this.batches){const {mesh}=batch;let count=0;
   for(const s of batch.sources.values()){mesh.instanceMatrix.array.set(s.matrices,count*16);if(s.colors&&mesh.instanceColor)mesh.instanceColor.array.set(s.colors,count*3);for(let i=0;i<s.count;i++)batch.selection[count+i]=s.base+i;count+=s.count;}
   mesh.count=count;mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor){mesh.instanceColor.clearUpdateRanges();mesh.instanceColor.needsUpdate=true;}batch.previousCount=-1;}
  this.invalidate();
 }
 update(camera,matrixReady=false){
  for(const mesh of this.shadowOnly)mesh.visible=false;
  if(camera.position.distanceToSquared(this.previousPosition)<.16&&Math.abs(camera.rotation.y-this.previousRotation.y)<.04&&Math.abs(camera.rotation.x-this.previousRotation.x)<.04&&Math.abs(camera.rotation.z-this.previousRotation.z)<.04&&Math.abs(camera.fov-this.previousFov)<.5&&Math.abs(camera.aspect-this.previousAspect)<.001)return;
  this.previousPosition.copy(camera.position);this.previousRotation.copy(camera.rotation);this.previousFov=camera.fov;this.previousAspect=camera.aspect;
  if(!matrixReady)camera.updateMatrixWorld();
  // A slightly wider culling frustum prevents edge popping between small updates.
  const projection=this.projection.copy(camera.projectionMatrix);projection.elements[0]*=.94;projection.elements[5]*=.94;this.view.multiplyMatrices(projection,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.view);
  const cx=camera.position.x,cz=camera.position.z;
  for(const mesh of this.terrainTiles){const b=mesh.geometry.boundingBox,dx=Math.max(b.min.x-cx,0,cx-b.max.x),dz=Math.max(b.min.z-cz,0,cz-b.max.z);mesh.visible=dx*dx+dz*dz<this.maxDistance*this.maxDistance&&this.frustum.intersectsBox(b);}
  const sphere=this.sphere;
  for(const batch of this.batches){
   const {mesh,range,selection}=batch;if(batch.shadowOnly||!mesh.visible)continue;let count=0,changed=false;const limit=range*range,visibleRange=Math.min(range,this.maxDistance),minRange=(mesh.userData.minVisibilityRange??0)**2,capacity=mesh.instanceMatrix.count,matrix=mesh.instanceMatrix.array,color=mesh.instanceColor?.array;
   for(const s of batch.sources.values())for(const cell of s.cells){
    const b=cell.bounds;if(cx<b.min.x-visibleRange||cx>b.max.x+visibleRange||cz<b.min.z-visibleRange||cz>b.max.z+visibleRange||!this.frustum.intersectsBox(b))continue;
    for(let i=cell.start;i<cell.end&&count<capacity;i++){
     const o=i*4,dx=s.spheres[o]-cx,dz=s.spheres[o+2]-cz,d2=dx*dx+dz*dz,r=s.spheres[o+3];
     if(d2<minRange||d2>Math.min(limit,(this.maxDistance+r)**2))continue;
     sphere.center.set(s.spheres[o],s.spheres[o+1],s.spheres[o+2]);sphere.radius=r;if(!this.frustum.intersectsSphere(sphere))continue;
     const id=s.base+i;if(selection[count]!==id){changed=true;selection[count]=id;matrix.set(s.matrices.subarray(i*16,i*16+16),count*16);if(color&&s.colors)color.set(s.colors.subarray(i*3,i*3+3),count*3);}
     count++;
    }
   }
   mesh.count=count;if(!changed&&count===batch.previousCount)continue;batch.previousCount=count;mesh.instanceMatrix.clearUpdateRanges();if(count)mesh.instanceMatrix.addUpdateRange(0,count*16);mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor){mesh.instanceColor.clearUpdateRanges();if(count)mesh.instanceColor.addUpdateRange(0,count*3);mesh.instanceColor.needsUpdate=true;}
  }
 }
}
