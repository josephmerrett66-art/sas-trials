import * as THREE from './vendor/three.module.js';
import {rivers} from './drainage.js?v=gullies-1';
import {terrainHeight} from './terrain.js?v=gullies-1';
import {tileTerrain} from './terrain-tiles.js';
export class ValleyRiver {
 constructor(scene){
  this.time={value:0};const positions=[],uvs=[];
  for(const route of rivers){
   const points=[];for(let i=0;i<route.points.length;i++){const p=route.points[i],q=route.points[i+1];points.push(p);if(q)points.push({x:(p.x+q.x)/2,z:(p.z+q.z)/2,width:(p.width+q.width)/2,s:(p.s+q.s)/2});}
   const row=(p,nx,nz)=>{const level=terrainHeight(p.x,p.z)+.16;
    const edge=side=>{let reach=p.width;for(let d=.2;d<=p.width;d+=.2)if(terrainHeight(p.x+nx*d*side,p.z+nz*d*side)>=level){reach=d-.1;break;}return [p.x+nx*reach*side,level,p.z+nz*reach*side,reach*side,p.s];};
    return [edge(-1),edge(1)];
   };
   // Joined cross sections follow the local downhill tangent. Shores stop at the
   // existing banks rather than lifting the surrounding ground up to the water.
   const rows=points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);return row(p,-dz/length,dx/length);});
   for(let i=1;i<rows.length;i++){const [a,b]=rows[i-1],[c,d]=rows[i];for(const p of [a,c,b,b,c,d]){positions.push(p[0],p[1],p[2]);uvs.push(p[3],p[4]);}}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
  // Opaque, lit water: no scene capture, reflection texture, transparency sorting or new light.
  const material=new THREE.MeshLambertMaterial({color:0x527e80,side:THREE.DoubleSide});
  material.customProgramCacheKey=()=> 'valley-river-gully-v1';
  material.onBeforeCompile=shader=>{shader.uniforms.riverTime=this.time;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vRiver;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRiver=uv;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vRiver;\nuniform float riverTime;').replace('#include <color_fragment>',`#include <color_fragment>
   // Fine advected broken ripples, with broad colour variation beneath them.
   float downstream=vRiver.y-riverTime*1.25;
   float ripple=sin(downstream*8.0+sin(vRiver.x*2.7+downstream*.4)*1.6);
   float crossing=sin(downstream*3.4-vRiver.x*4.8+sin(vRiver.y*.18));
   float fade=1.0-smoothstep(.5,2.0,fwidth(downstream*8.0));
   float glint=smoothstep(.88,1.0,ripple)*smoothstep(.55,.95,crossing)*fade;
   float pools=sin(vRiver.x*.18+vRiver.y*.07)*sin(vRiver.y*.13);
   diffuseColor.rgb*=.82+.08*pools+.07*ripple*fade;
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.40,.56,.53),glint*.28);
  `);};
  this.group=tileTerrain(geometry,material,'Valley river',80);scene.add(this.group);geometry.dispose();
 }
 step(dt){this.time.value+=dt;}
}
