import * as THREE from './vendor/three.module.js';
import {terrainHeight,WORLD_SIZE,TERRAIN_SEGMENTS,TERRAIN_STEP} from './terrain.js?v=big-1';
let heightTexture;
export function stonePathSites(routes,model){
 const sites=[];
 for(const route of routes){let z=route.start;for(;;){sites.push({x:route.center(z),z,width:route.width(z)*2/model.footprint.x,length:4/model.footprint.z,height:.1/model.height,y:.025,rotation:Math.atan(route.slope(z)),shade:.96});if(z===route.end)break;let next=Math.min(route.end,z+2.6/Math.hypot(1,route.slope(z)));while(Math.hypot(route.center(next)-route.center(z),next-z)>2.6)next=(z+next)*.5;z=next;}}
 return sites;
}
export function drapeStoneMaterial(material){
 if(!heightTexture){const n=TERRAIN_SEGMENTS+1,data=new Float32Array(n*n);for(let z=0;z<n;z++)for(let x=0;x<n;x++)data[z*n+x]=terrainHeight(x*TERRAIN_STEP-WORLD_SIZE/2,z*TERRAIN_STEP-WORLD_SIZE/2);heightTexture=new THREE.DataTexture(data,n,n,THREE.RedFormat,THREE.FloatType);heightTexture.needsUpdate=true;}
 material.customProgramCacheKey=()=> 'terrain-draped-stones-v1';
 material.onBeforeCompile=shader=>{
 shader.uniforms.stoneTerrain={value:heightTexture};
 shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
 uniform sampler2D stoneTerrain;
 float stoneGround(vec2 world){vec2 grid=clamp((world+${WORLD_SIZE/2}.0)/${TERRAIN_STEP}.0,vec2(0.),vec2(${TERRAIN_SEGMENTS-.000001}));vec2 cell=floor(grid),t=grid-cell;vec2 uv=(cell+.5)/${TERRAIN_SEGMENTS+1}.0;float a=texture2D(stoneTerrain,uv).r,b=texture2D(stoneTerrain,uv+vec2(0.,1.)/${TERRAIN_SEGMENTS+1}.0).r,d=texture2D(stoneTerrain,uv+vec2(1.,0.)/${TERRAIN_SEGMENTS+1}.0).r,c=texture2D(stoneTerrain,uv+vec2(1.,1.)/${TERRAIN_SEGMENTS+1}.0).r;return t.x+t.y<=1.?a+t.x*(d-a)+t.y*(b-a):c+(1.-t.x)*(b-c)+(1.-t.y)*(d-c);}
 `).replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 stoneWorld=modelMatrix*instanceMatrix*vec4(position,1.);
 transformed.y=position.y+(stoneGround(stoneWorld.xz)-instanceMatrix[3].y+.025)/instanceMatrix[1].y;
 `);
 };
 material.needsUpdate=true;return material;
}

export function trimStoneUndersides(geometry){
 const normal=geometry.attributes.normal,index=geometry.index,kept=[];
 for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);if(normal.getY(a)<-.35&&normal.getY(b)<-.35&&normal.getY(c)<-.35)continue;kept.push(a,b,c);}
 geometry.setIndex(kept);return geometry;
}
