import * as THREE from './vendor/three.module.js';
import {rivers} from './terrain.js?v=big-1';
import {tileTerrain} from './terrain-tiles.js';

// One level water ribbon per channel at the river's surface height. It is wider than the
// channel so its edges always end under the floodplain: the carved banks form the shoreline.
export class ValleyRiver {
 constructor(scene){
  this.time={value:0};const positions=[],uvs=[],main=rivers.find(r=>r.main);
  for(const river of rivers){
   const pts=river.points,end=pts.at(-1),joinReach=river.main?0:(main?mainHalfNear(main,end)+9:0),rows=[];
   for(let i=0;i<pts.length;i++){
    const p=pts[i],a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],tx=b.x-a.x,tz=b.z-a.z,len=Math.hypot(tx,tz)||1,nx=-tz/len,nz=tx/len;
    // Curvature limit on the inside of tight bends stops the ribbon folding over itself.
    const c=pts[Math.max(0,i-3)],d=pts[Math.min(pts.length-1,i+3)],turn=Math.atan2(d.z-p.z,d.x-p.x)-Math.atan2(p.z-c.z,p.x-c.x),bend=Math.atan2(Math.sin(turn),Math.cos(turn)),span=Math.max(1,Math.hypot(d.x-c.x,d.z-c.z)),radius=Math.abs(bend)>1e-3?span/Math.abs(bend):Infinity;
    const half=p.w+7.5,inner=Math.min(half,radius*.85),left=bend>0?inner:half,right=bend>0?half:inner;
    // A stream sinks a few centimetres under the river where their ribbons overlap.
    const y=p.S-(Math.hypot(p.x-end.x,p.z-end.z)<joinReach?.06:0);
    rows.push([[p.x+nx*left,y,p.z+nz*left,-left,p.s],[p.x-nx*right,y,p.z-nz*right,right,p.s]]);
   }
   for(let i=1;i<rows.length;i++){const [a,b]=rows[i-1],[c,d]=rows[i];for(const v of [a,c,b,b,c,d]){positions.push(v[0],v[1],v[2]);uvs.push(v[3],v[4]);}}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
  // Opaque, lit water: no scene capture, reflection texture, transparency sorting or new light.
  const material=new THREE.MeshLambertMaterial({color:0x4f7a7c,side:THREE.DoubleSide});
  material.customProgramCacheKey=()=> 'valley-river-network-v1';
  material.onBeforeCompile=shader=>{shader.uniforms.riverTime=this.time;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vRiver;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRiver=uv;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vRiver;\nuniform float riverTime;').replace('#include <color_fragment>',`#include <color_fragment>
   // Fine advected broken ripples, with broad colour variation beneath them.
   float downstream=vRiver.y-riverTime*1.25;
   float ripple=sin(downstream*8.0+sin(vRiver.x*2.7+downstream*.4)*1.6);
   float crossing=sin(downstream*3.4-vRiver.x*4.8+sin(vRiver.y*.18));
   float fade=1.0-smoothstep(.5,2.0,fwidth(downstream*8.0));
   float glint=smoothstep(.88,1.0,ripple)*smoothstep(.55,.95,crossing)*fade;
   float pools=sin(vRiver.x*.18+vRiver.y*.07)*sin(vRiver.y*.13);
   diffuseColor.rgb*=.84+.07*pools+.06*ripple*fade;
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.44,.6,.57),glint*.3);
  `);};
  this.group=tileTerrain(geometry,material,'Valley river',80);for(const tile of this.group.children)tile.receiveShadow=false;scene.add(this.group);geometry.dispose();
  this.triangles=positions.length/9;
 }
 step(dt){this.time.value+=dt;}
}
function mainHalfNear(main,p){let best=main.points[0],bd=Infinity;for(const q of main.points){const d=Math.hypot(q.x-p.x,q.z-p.z);if(d<bd){bd=d;best=q;}}return best.w+7.5;}
