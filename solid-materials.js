import * as THREE from './vendor/three.module.js';
// The pack has many solid-colour material slots. Vertex colours retain the palette
// while a single material draws each mesh, including its existing skin weights.
export function consolidateSolidMaterials(object){
 object.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  if(materials.some(mat=>mat.map||mat.transparent||mat.opacity<1))return;
  const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  const colors=new Float32Array(geometry.attributes.position.count*3),oldColor=geometry.getAttribute('color');colors.fill(1);
  const groups=geometry.groups.length?geometry.groups:[{start:0,count:geometry.attributes.position.count,materialIndex:0}];
  for(const group of groups){
   const color=materials[group.materialIndex??0]?.color??new THREE.Color(0xffffff);
   for(let i=group.start;i<Math.min(colors.length/3,group.start+group.count);i++){
    colors[i*3]=color.r*(oldColor?.getX(i)??1);colors[i*3+1]=color.g*(oldColor?.getY(i)??1);colors[i*3+2]=color.b*(oldColor?.getZ(i)??1);
   }
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.clearGroups();
  mesh.geometry=geometry;mesh.material=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true,side:materials[0].side});
 });
 return object;
}
