import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {terrainHeight} from './terrain.js?v=gullies-1';
let material;
export function landmarkMaterial(){return material??=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:.08,flatShading:true});}
export function buildLandmark(scene,name,location,build){
 const pieces=[],matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1),position=new THREE.Vector3(),color=new THREE.Color();
 const part=(geometry,tint,x,y,z,rx=0,ry=0,rz=0)=>{
  if(geometry.index){const source=geometry;geometry=source.toNonIndexed();source.dispose();}
  rotation.setFromEuler(new THREE.Euler(rx,ry,rz));position.set(x,y,z);matrix.compose(position,rotation,scale);geometry.applyMatrix4(matrix);color.setHex(tint);
  const colors=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.deleteAttribute('uv');pieces.push(geometry);
 };
 const box=(w,h,d,tint,x,y,z,rx=0,ry=0,rz=0)=>part(new THREE.BoxGeometry(w,h,d),tint,x,y,z,rx,ry,rz);
 build({box,part});const geometry=mergeGeometries(pieces,false);for(const piece of pieces)piece.dispose();geometry.computeBoundingSphere();
 const mesh=new THREE.InstancedMesh(geometry,landmarkMaterial(),1);mesh.name=name;
 position.set(location.x,terrainHeight(location.x,location.z),location.z);
 const sx=(terrainHeight(location.x+1,location.z)-terrainHeight(location.x-1,location.z))/2,sz=(terrainHeight(location.x,location.z+1)-terrainHeight(location.x,location.z-1))/2;
 rotation.setFromEuler(new THREE.Euler(-Math.atan(sz),0,Math.atan(sx)));matrix.compose(position,rotation,scale);mesh.setMatrixAt(0,matrix);mesh.computeBoundingSphere();mesh.castShadow=false;mesh.receiveShadow=false;scene.add(mesh);return mesh;
}
