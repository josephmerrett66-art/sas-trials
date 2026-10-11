import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// One repeatable woodland field controls families and density, rather than
// choosing an unrelated species at every planting location.
export function woodlandField(x,z){
 const grove=Math.sin(x*.018+Math.sin(z*.012)*1.8)+Math.cos(z*.021-x*.006)*.75;
 const opening=Math.sin(x*.037+z*.019)*Math.cos(z*.029-x*.011);
 return {grove,density:opening>.63?.32:grove>.25?.86:.68};
}
export const TREE_DETAIL_DISTANCE=92;
// Collapse only sub-pixel bark detail once at load time. Keep every foliage
// triangle, painted leaf outline and the overall branching silhouette intact.
export function simplifyTreeBark(source,cell=.009){
 const p=source.attributes.position,n=source.attributes.normal,uv=source.attributes.uv;
 const ids=new Uint32Array(p.count),cells=new Map(),vertices=[];
 for(let i=0;i<p.count;i++){
  const key=Math.round(p.getX(i)/cell)+':'+Math.round(p.getY(i)/cell)+':'+Math.round(p.getZ(i)/cell);
  let id=cells.get(key);if(id===undefined){id=vertices.length;cells.set(key,id);vertices.push({x:p.getX(i),y:p.getY(i),z:p.getZ(i),nx:0,ny:0,nz:0,u:uv.getX(i),v:uv.getY(i)});}
  ids[i]=id;const v=vertices[id];v.nx+=n.getX(i);v.ny+=n.getY(i);v.nz+=n.getZ(i);
 }
 const indices=[],input=source.index.array,seen=new Set();
 for(let i=0;i<input.length;i+=3){const a=ids[input[i]],b=ids[input[i+1]],c=ids[input[i+2]];if(a===b||a===c||b===c)continue;const key=[a,b,c].sort((x,y)=>x-y).join(':');if(seen.has(key))continue;seen.add(key);indices.push(a,b,c);}
 // Thin collapsed twigs can leave isolated tip faces. Remove those tiny
 // islands so simplified bark never produces floating triangle fragments.
 const parent=Uint32Array.from(vertices,(_,i)=>i),root=a=>{while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a];}return a;};
 for(let i=0;i<indices.length;i+=3){parent[root(indices[i+1])]=root(indices[i]);parent[root(indices[i+2])]=root(indices[i]);}
 const sizes=new Map();for(let i=0;i<indices.length;i+=3){const id=root(indices[i]);sizes.set(id,(sizes.get(id)??0)+1);}
 let kept=0;for(let i=0;i<indices.length;i+=3){if(sizes.get(root(indices[i]))<4)continue;indices[kept++]=indices[i];indices[kept++]=indices[i+1];indices[kept++]=indices[i+2];}indices.length=kept;
 const positions=[],normals=[],coords=[];for(const v of vertices){positions.push(v.x,v.y,v.z);const length=Math.hypot(v.nx,v.ny,v.nz)||1;normals.push(v.nx/length,v.ny/length,v.nz/length);coords.push(v.u,v.v);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(coords,2));geometry.setIndex(indices);geometry.computeBoundingSphere();source.dispose();return geometry;
}
export async function loadNatureTrees(){
 const loader=new GLTFLoader(),models=[],textures=new Map();
 for(const name of ['Pine_5','Pine_4','CommonTree_4']){
  const {scene}=await loader.loadAsync(new URL(`./assets/nature/${name}.gltf`,import.meta.url).href);
  scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(scene),height=bounds.max.y-bounds.min.y,parts=[];
  scene.traverse(mesh=>{
   if(!mesh.isMesh)return;
   let geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);geometry.translate(0,-bounds.min.y,0);geometry.scale(1/height,1/height,1/height);
   const leaf=/Leaves/.test(mesh.material.name);if(!leaf)geometry=simplifyTreeBark(geometry);
   let map=textures.get(mesh.material.name);if(!map){map=mesh.material.map;textures.set(mesh.material.name,map);}else if(map!==mesh.material.map)mesh.material.map.dispose();
   // Diffuse textures retain painted leaf shapes; Lambert avoids unused PBR work.
   const material=new THREE.MeshLambertMaterial({map,color:leaf?0xd5dfae:0xc3ad94,alphaTest:leaf?.45:0,side:mesh.material.side});
   material.userData.surface=leaf?'foliage':'bark';
   if(leaf)material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSurfaceWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfaceWorld=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;');};
   parts.push({geometry,material,leaf});
  });models.push({name,parts});
 }
 return models;
}
export function addNatureTrees(scene,trees,models){
 const transform=new THREE.Object3D(),shade=new THREE.Color();
 models.forEach((model,family)=>{
  const instances=trees.filter(t=>t.kitFamily===family&&t.species!==4);
  for(const part of model.parts){
   const mesh=new THREE.InstancedMesh(part.geometry,part.material,instances.length);mesh.name=`Woodland ${model.name} ${part.leaf?'crowns':'trunks'}`;
   mesh.userData.treeDetail=true;mesh.userData.visibilityRange=TREE_DETAIL_DISTANCE;
   instances.forEach((t,i)=>{transform.position.set(t.x,t.ground,t.z);transform.rotation.set(t.leanZ*.4,t.rotation,-t.leanX*.4);transform.scale.setScalar(t.height);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);shade.setScalar(.83+t.shade*.17);mesh.setColorAt(i,shade);});
   // Hidden low-cost silhouettes provide the single cached shadow bake for the whole map.
   mesh.castShadow=false;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
  }
 });
}
