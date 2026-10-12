import * as THREE from './vendor/three.module.js';
import {terrainHeight} from './terrain.js?v=big-1';

// A fixed pool, one material/draw, and reused typed buffers. Flight paths stay
// anchored in the world; new encounters fade in rather than following the camera.
const wing=[0,0,-.12,.13,0,-.17,.18,0,.02,0,0,-.12,.18,0,.02,.09,0,.12];
const body=[-.012,0,-.12,.012,0,-.12,.012,0,.12,-.012,0,-.12,.012,0,.12,-.012,0,.12];
const leaf=[0,0,-.14,.065,.025,0,0,0,.14,0,0,-.14,0,0,.14,-.065,.025,0];
const palette=[[.85,.58,.22],[.85,.82,.61],[.48,.64,.73]];
export class ForestLife {
 constructor(scene,{seed=7413}={}){
  this.seed=seed;this.time=0;this.records=[];
  this.positions=new Float32Array(132*3);this.normals=new Float32Array(132*3);this.colors=new Float32Array(132*3);this.alpha=new Float32Array(132);
  let vertex=0;
  for(let i=0;i<12;i++){const butterfly=i<5,count=butterfly?18:6,r={butterfly,start:vertex,count,age:0,duration:0,wait:i<3?0:3+i*2,x:0,y:0,z:0,size:1,phase:0,yaw:0};this.records.push(r);
   const color=butterfly?palette[i%3]:[.43,.35,.16];for(let j=vertex;j<vertex+count;j++){this.colors.set(color,j*3);}if(butterfly)for(let j=vertex+12;j<vertex+18;j++)this.colors.set([.12,.11,.08],j*3);vertex+=count;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('normal',new THREE.BufferAttribute(this.normals,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3));geometry.setAttribute('lifeAlpha',new THREE.BufferAttribute(this.alpha,1).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,depthWrite:false,forceSinglePass:true});
  material.onBeforeCompile=shader=>{shader.vertexShader='attribute float lifeAlpha;varying float vLifeAlpha;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLifeAlpha=lifeAlpha;');shader.fragmentShader='varying float vLifeAlpha;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vLifeAlpha; if(diffuseColor.a<.01)discard;');};material.customProgramCacheKey=()=> 'forest-life-v1';
  this.mesh=new THREE.Mesh(geometry,material);this.mesh.name='Sparse butterflies and falling leaves';this.mesh.frustumCulled=false;this.mesh.visible=false;this.mesh.updateMatrixWorld();this.mesh.matrixAutoUpdate=false;this.mesh.matrixWorldAutoUpdate=false;scene.add(this.mesh);
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 spawn(r,camera){
  const angle=-camera.rotation.y+(this.random()-.5)*2.5,distance=3+this.random()*12;
  r.x=camera.position.x+Math.sin(angle)*distance;r.z=camera.position.z-Math.cos(angle)*distance;r.y=terrainHeight(r.x,r.z)+(r.butterfly?.7+this.random()*1.6:4+this.random()*4);
  r.age=0;r.duration=r.butterfly?18+this.random()*18:14+this.random()*12;r.size=r.butterfly?.9+this.random()*.35:.7+this.random()*.6;r.phase=this.random()*Math.PI*2;r.yaw=this.random()*Math.PI*2;
 }
 step(dt,active,camera,weather,night){
  if(!active)return;dt=Math.max(0,Math.min(dt,.05));this.time+=dt;let visible=0;
  for(const r of this.records){
   let opacity=0;
   if(r.duration>0){r.age+=dt;const dx=r.x-camera.position.x,dz=r.z-camera.position.z;
    if(r.age>=r.duration||dx*dx+dz*dz>32*32){r.duration=0;r.wait=r.butterfly?9+this.random()*24:5+this.random()*14;}
   }else{r.wait-=dt;if(r.wait<=0&&!night&&(!r.butterfly||weather.rain<.15))this.spawn(r,camera);}
   if(r.duration>0){opacity=Math.min(1,r.age/2,(r.duration-r.age)/3)*(r.butterfly?Math.max(0,1-weather.rain*4):.75);if(night)opacity=0;}
   if(opacity<=.01){this.alpha.fill(0,r.start,r.start+r.count);continue;}
   const a=r.age,p=r.phase,s=r.size;
   let x=r.x,y=r.y,z=r.z,yaw=r.yaw;
   if(r.butterfly){x+=Math.sin(a*.6+p)*1.2;z+=Math.cos(a*.45+p)*1.1;y+=Math.sin(a*1.6+p)*.2;yaw+=Math.sin(a*.5+p)*.7;}
   else{x+=a*(.08+weather.gust*.13);z+=Math.sin(a*.35+p)*.7;y-=a*.2;yaw+=a*.55;opacity*=Math.min(1,Math.max(0,(r.y-a*.2-terrainHeight(r.x,r.z))/.5));}
   if(opacity>.01)visible++;
   const cos=Math.cos(yaw),sin=Math.sin(yaw),flap=Math.sin(a*27+p)*.95,fold=Math.cos(flap),lift=Math.sin(flap);
   for(let j=0;j<r.count;j++){
    let lx,ly,lz;
    if(r.butterfly&&j<12){const k=(j%6)*3,side=j<6?-1:1;lx=wing[k]*side*fold*s;ly=wing[k]*lift*s;lz=wing[k+2]*s;}
    else{const source=r.butterfly?body:leaf,k=(r.butterfly?j-12:j)*3;lx=source[k]*s;ly=source[k+1]*s+(r.butterfly?.005:Math.sin(a*2+p)*source[k]*s);lz=source[k+2]*s;}
    const index=r.start+j,k=index*3;this.positions[k]=x+lx*cos+lz*sin;this.positions[k+1]=y+ly;this.positions[k+2]=z-lx*sin+lz*cos;this.alpha[index]=opacity;
    const nx=r.butterfly&&j<12?-(j<6?-1:1)*lift:0;this.normals[k]=nx*cos;this.normals[k+1]=r.butterfly&&j<12?fold:1;this.normals[k+2]=-nx*sin;
   }
  }
  this.mesh.visible=visible>0;this.mesh.geometry.attributes.position.needsUpdate=true;this.mesh.geometry.attributes.normal.needsUpdate=true;this.mesh.geometry.attributes.lifeAlpha.needsUpdate=true;
 }
}
