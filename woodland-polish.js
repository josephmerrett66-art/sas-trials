import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {trails,trailClearance} from './landmark-routes.js?v=no-river-1';
import {WORLD_SIZE,riverClearance} from './terrain.js?v=river-1';

function triangles(positions,colors=null){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));if(colors)geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;}
function merge(core,detail){const base=core.index?core.toNonIndexed():core;base.deleteAttribute('uv');const result=mergeGeometries([base,detail]);if(base!==core)base.dispose();core.dispose();detail.dispose();result.computeBoundingSphere();return result;}
// Small needle fans break up the solid skirt, without extra meshes or materials.
export function refineConifer(core){
 const p=[];for(let i=0;i<6;i++){const a=i*Math.PI/3+.17,x=Math.cos(a),z=Math.sin(a),tx=-z*.08,tz=x*.08;
  const root=[x*.45,-.35,z*.45],left=[x*.9+tx,-.46,z*.9+tz],tip=[x*1.08,-.55,z*1.08];p.push(...root,...left,...tip,...root,...tip,...left);
 }return merge(core,triangles(p));
}
// A compact core plus pointed leaf sprays makes broadleaf outlines less spherical.
export function broadleafGeometry(){
 const core=new THREE.IcosahedronGeometry(.95,1),p=[];
 for(let i=0;i<16;i++){const a=i*2.399,y=-.65+(i%7)*.21,r=Math.sqrt(Math.max(.1,1-y*y))*.82,x=Math.cos(a)*r,z=Math.sin(a)*r,dx=Math.cos(a)*.11,dz=Math.sin(a)*.11,tx=-Math.sin(a)*.065,tz=Math.cos(a)*.065;
  const root=[x-dx,y-.035,z-dz],left=[x+tx,y+.045,z+tz],tip=[x+dx*1.65,y+.07,z+dz*1.65],right=[x-tx,y+.045,z-tz];
  p.push(...root,...left,...tip,...root,...tip,...right,...root,...tip,...left,...root,...right,...tip);
 }return merge(core,triangles(p));
}
export function flowerPatchGeometry(){
 const p=[],c=[],tint=new THREE.Color();
 const tri=(a,b,d,color)=>{p.push(...a,...b,...d);tint.setHex(color);for(let i=0;i<3;i++)c.push(tint.r,tint.g,tint.b);};
 const petalColors=[0xd7ce9b,0xaa99bd,0xd7b953];
 for(let i=0;i<7;i++){const a=i*2.399,r=i===0?0:.22+(i%3)*.12,x=Math.cos(a)*r,z=Math.sin(a)*r,h=.24+(i%4)*.055;
  tri([x-.012,-.18,z],[x+.012,-.18,z],[x,h,z],0x526c37);tri([x,-.18,z-.012],[x,-.18,z+.012],[x,h,z],0x526c37);
  for(const side of [-1,1])tri([x,.08,z],[x+side*.12,.14,z-.035],[x+side*.065,.13,z+.03],0x6f8544);
  for(let j=0;j<5;j++){const angle=j*Math.PI*2/5+.3,dx=Math.cos(angle),dz=Math.sin(angle),tx=-dz*.022,tz=dx*.022;
   const root=[x,h,z],left=[x+dx*.045+tx,h+.012,z+dz*.045+tz],tip=[x+dx*.079,h+.02,z+dz*.079],right=[x+dx*.045-tx,h+.012,z+dz*.045-tz];tri(root,left,tip,petalColors[i%3]);tri(root,tip,right,petalColors[i%3]);
  }
  tri([x-.021,h+.025,z-.018],[x+.022,h+.025,z-.018],[x,h+.025,z+.024],0x9f7a32);
 }const geometry=triangles(p,c);geometry.computeBoundingSphere();return geometry;
}
export function flowerSites(){
 let seed=1953;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const sites=[];
 const add=(x,z)=>{if(trailClearance(x,z)<.65||riverClearance(x,z)<.5||Math.hypot(x,z-12)<2.5)return;sites.push({x,z,size:.75+random()*.5,rotation:random()*6.28,shade:.85+random()*.15});};
 for(const [x,z] of [[-3.8,5],[4.4,-7],[-4.6,-17],[7,-27],[-7,24]])add(x,z);
 for(let i=0;i<550;i++)add((random()-.5)*(WORLD_SIZE-40),(random()-.5)*(WORLD_SIZE-40));
 for(const trail of trails)for(let z=trail.start+15;z<trail.end-15;z+=38+random()*35){const side=random()<.5?-1:1;add(trail.center(z)+side*(trail.width(z)+2+random()*3),z);}
 return sites;
}
