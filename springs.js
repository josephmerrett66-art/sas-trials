import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {terrainHeight,WORLD_SIZE,riverClearance} from './terrain.js?v=big-1';
import {trailClearance} from './landmark-routes.js?v=big-1';
import {START} from './navigation.js?v=big-1';
import {landmarkMaterial} from './landmark-builder.js?v=big-1';
import {nearbyObstacles} from './obstacle-grid.js';

export const SPRING_REACH=3.2;
// Springs sit at the bottom of natural hollows, away from trees, tracks and checkpoints,
// spread so a route always passes within reach of one or two. Computed once.
export function findSprings(obstacles,points,{spacing=300}={}){
 const half=WORLD_SIZE/2-40,candidates=[];
 for(let z=-half;z<=half;z+=20)for(let x=-half;x<=half;x+=20){
  const h=terrainHeight(x,z);let depth=Infinity;
  for(let a=0;a<8;a++)depth=Math.min(depth,terrainHeight(x+Math.cos(a*Math.PI/4)*25,z+Math.sin(a*Math.PI/4)*25)-h);
  if(depth<=.15)continue;
  // Settle onto the true low point of the hollow.
  let best={x,z,h};for(let dz=-10;dz<=10;dz+=2)for(let dx=-10;dx<=10;dx+=2){const y=terrainHeight(x+dx,z+dz);if(y<best.h)best={x:x+dx,z:z+dz,h:y};}
  candidates.push({...best,depth},{x,z,h,depth:depth-.001});
 }
 const near=[],clear=p=>riverClearance(p.x,p.z)>25&&nearbyObstacles(obstacles,p.x,p.z,4,near).every(o=>Math.hypot(p.x-o.x,p.z-o.z)>o.radius+4)&&trailClearance(p.x,p.z)>4&&points.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>40)&&Math.hypot(p.x-START.x,p.z-START.z)>60;
 const springs=[];
 for(const p of candidates.filter(clear).sort((a,b)=>b.depth-a.depth||a.x-b.x||a.z-b.z))if(springs.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>spacing))springs.push({x:p.x,z:p.z,y:terrainHeight(p.x,p.z)});
 return springs;
}
export function nearbySpring(springs,player){for(const s of springs)if(Math.hypot(player.x-s.x,player.z-s.z)<=SPRING_REACH&&Math.abs(player.y-s.y)<2.5)return s;return null;}

// All springs share two draws: one for banks, stones, reeds and marker stakes, one for water.
export function addSprings(scene,springs){
 let seed=9127;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const pieces=[],pools=[],matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),position=new THREE.Vector3(),color=new THREE.Color();
 const paint=(geometry,tint)=>{color.setHex(tint);const colors=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.deleteAttribute('uv');return geometry;};
 const part=(geometry,tint,x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>{if(geometry.index){const source=geometry;geometry=source.toNonIndexed();source.dispose();}q.setFromEuler(new THREE.Euler(rx,ry,rz));position.set(x,y,z);scale.set(sx,sy,sz);matrix.compose(position,q,scale);geometry.applyMatrix4(matrix);pieces.push(paint(geometry,tint));};
 for(const s of springs){
  // Muddy bank follows the ground exactly, a few centimetres above it.
  const bank=new THREE.CircleGeometry(2.9,16,0,Math.PI*2).toNonIndexed();bank.rotateX(-Math.PI/2);
  const bp=bank.attributes.position;for(let i=0;i<bp.count;i++){const a=Math.atan2(bp.getZ(i),bp.getX(i)),k=.78+.28*Math.abs(Math.sin(a*1.7+s.z))+.08*Math.sin(a*5),x=bp.getX(i)*k+s.x,z=bp.getZ(i)*k+s.z;bp.setXYZ(i,x,terrainHeight(x,z)+.035,z);}bank.computeVertexNormals();pieces.push(paint(bank,0x4c4130));
  // Irregular still pool, level and just above the highest ground it covers.
  const pool=new THREE.CircleGeometry(1.75,9).toNonIndexed();pool.rotateX(-Math.PI/2);const pp=pool.attributes.position;let top=-Infinity;
  for(let i=0;i<pp.count;i++){const r=Math.hypot(pp.getX(i),pp.getZ(i));if(r>.01){const a=Math.atan2(pp.getZ(i),pp.getX(i)),k=.82+.3*Math.abs(Math.sin(a*2.3+s.x));pp.setX(i,Math.cos(a)*r*k);pp.setZ(i,Math.sin(a)*r*k);}top=Math.max(top,terrainHeight(pp.getX(i)+s.x,pp.getZ(i)+s.z));}
  for(let i=0;i<pp.count;i++)pp.setXYZ(i,pp.getX(i)+s.x,top+.06,pp.getZ(i)+s.z);pool.computeVertexNormals();pool.deleteAttribute('uv');pools.push(pool);
  // Mossy stones ring the water's edge and hide where it meets the bank.
  for(let i=0;i<11;i++){const a=i/11*Math.PI*2+random()*.3,r=1.75+random()*.45,x=s.x+Math.cos(a)*r,z=s.z+Math.sin(a)*r,size=.2+random()*.24;part(new THREE.IcosahedronGeometry(size,0),random()<.45?0x5d6a4a:0x6d7068,x,terrainHeight(x,z)+size*.25,z,random()*3,random()*3,0,1,.55,1);}
  for(let i=0;i<14;i++){const a=random()*Math.PI*2,r=1.5+random()*1.1,x=s.x+Math.cos(a)*r,z=s.z+Math.sin(a)*r,h=.55+random()*.55;part(new THREE.ConeGeometry(.035,h,3),random()<.5?0x7b8a47:0x93945a,x,terrainHeight(x,z)+h/2,z,(random()-.5)*.35,random()*3,(random()-.5)*.35);}
  // Timber stake with a blue band, the same timber as the checkpoint posts.
  const sx=s.x+2.45,sz=s.z+.4,sy=terrainHeight(sx,sz);part(new THREE.BoxGeometry(.12,1.05,.12),0x776046,sx,sy+.52,sz);part(new THREE.BoxGeometry(.13,.16,.13),0x3d6f8e,sx,sy+.92,sz);
 }
 const meshes=[];
 if(pieces.length){const geometry=mergeGeometries(pieces,false);for(const g of pieces)g.dispose();geometry.computeBoundingSphere();const banks=new THREE.Mesh(geometry,landmarkMaterial());banks.name='Spring banks and stones';meshes.push(banks);}
 if(pools.length){const geometry=mergeGeometries(pools,false);for(const g of pools)g.dispose();geometry.computeBoundingSphere();const water=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x3f6463,roughness:.18,metalness:.15,flatShading:true}));water.name='Spring water';meshes.push(water);}
 for(const mesh of meshes){mesh.castShadow=false;mesh.receiveShadow=false;mesh.updateMatrixWorld(true);mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;scene.add(mesh);}
 return meshes;
}
// Like the checkpoint posts: skip both draws unless a spring is inside the fog distance.
export function updateSpringVisibility(meshes,springs,camera,range){let near=false;for(const s of springs){const dx=s.x-camera.position.x,dz=s.z-camera.position.z;if(dx*dx+dz*dz<range*range){near=true;break;}}for(const mesh of meshes)mesh.visible=near;}
