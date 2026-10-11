import * as THREE from './vendor/three.module.js';

// Keep exact height-field triangles, but submit only nearby terrain tiles.
export function tileTerrain(geometry,material,name,tileSize=80){
 const root=new THREE.Group();root.name=name;
 const position=geometry.attributes.position,index=geometry.index,tiles=new Map(),count=index?index.count:position.count;
 for(let i=0;i<count;i+=3){
  const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),x=ids.reduce((s,id)=>s+position.getX(id),0)/3,z=ids.reduce((s,id)=>s+position.getZ(id),0)/3,key=`${Math.floor(x/tileSize)},${Math.floor(z/tileSize)}`;
  if(!tiles.has(key))tiles.set(key,[]);tiles.get(key).push(...ids);
 }
 for(const [key,ids] of tiles){
  const part=new THREE.BufferGeometry();
  for(const [attribute,source] of Object.entries(geometry.attributes)){
   const values=new Float32Array(ids.length*source.itemSize);
   for(let i=0;i<ids.length;i++)for(let j=0;j<source.itemSize;j++)values[i*source.itemSize+j]=source.array[ids[i]*source.itemSize+j];
   part.setAttribute(attribute,new THREE.BufferAttribute(values,source.itemSize));
  }
  part.computeBoundingBox();part.computeBoundingSphere();const mesh=new THREE.Mesh(part,material);mesh.name=`${name} tile ${key}`;mesh.receiveShadow=true;mesh.userData.terrainTile=true;mesh.updateMatrixWorld(true);mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;root.add(mesh);
 }
 return root;
}
