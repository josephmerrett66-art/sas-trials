import * as THREE from './vendor/three.module.js';

// Ink the actual polygon creases in the existing material pass. Instanced and
// skinned meshes keep their normal animation/culling; no duplicate scene draw.
export function installOutlines(scene){
 const geometries=new Map(),materials=new Map();
 const point=(a,i)=>`${Math.round(a.getX(i)*10000)},${Math.round(a.getY(i)*10000)},${Math.round(a.getZ(i)*10000)}`;
 const key=(a,b)=>a<b?`${a}|${b}`:`${b}|${a}`;
 scene.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry?.attributes.position||mesh.material?.transparent||['Faceted forest floor','Winding dirt trail','Faceted sky clouds','Distant mountain silhouettes'].includes(mesh.name)||mesh.geometry.type==='PlaneGeometry')return;
  const original=mesh.geometry;
  if(!geometries.has(original)){
   const edges=new THREE.EdgesGeometry(original,24),ep=edges.attributes.position,set=new Set();
   for(let i=0;i<ep.count;i+=2)set.add(key(point(ep,i),point(ep,i+1)));
   const g=original.index?original.toNonIndexed():original.clone(),p=g.attributes.position;
   const bary=new Float32Array(p.count*3),enabled=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i+=3){
    const a=point(p,i),b=point(p,i+1),c=point(p,i+2);
    const flags=[set.has(key(b,c))?1:0,set.has(key(c,a))?1:0,set.has(key(a,b))?1:0];
    for(let j=0;j<3;j++){bary[(i+j)*3+j]=1;enabled.set(flags,(i+j)*3);}
   }
   g.setAttribute('inkBary',new THREE.BufferAttribute(bary,3));g.setAttribute('inkEdges',new THREE.BufferAttribute(enabled,3));edges.dispose();geometries.set(original,g);
  }
  mesh.geometry=geometries.get(original);
  const decorate=old=>{
   if(materials.has(old))return materials.get(old);
   const material=old.clone(),compile=old.onBeforeCompile,cache=old.customProgramCacheKey();
   material.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);
    shader.vertexShader='attribute vec3 inkBary; attribute vec3 inkEdges; varying vec3 vInkBary; varying vec3 vInkEdges;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvInkBary=inkBary; vInkEdges=inkEdges;');
    shader.fragmentShader='varying vec3 vInkBary; varying vec3 vInkEdges;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
     vec3 inkDistance = vInkBary / max(fwidth(vInkBary), vec3(.00001));
     vec3 inkCoverage = mix(vec3(1.0), smoothstep(vec3(.55), vec3(1.35), inkDistance), vInkEdges);
     outgoingLight *= min(inkCoverage.x, min(inkCoverage.y, inkCoverage.z));
     #include <opaque_fragment>
    `);
   };
   material.customProgramCacheKey=()=>cache+'-polygon-ink-v1';materials.set(old,material);return material;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(decorate):decorate(mesh.material);
 });
 return {geometries:geometries.size,materials:materials.size};
}
