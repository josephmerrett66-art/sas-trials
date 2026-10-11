import * as THREE from './vendor/three.module.js';
import {fitForestShadows} from './forest-shadows.js?v=whole-world-1';

// Four comparisons interpolate neighbouring depth texels instead of the default
// soft filter's nine groups of comparisons. Keep all existing material hooks.
export const forestShadowChunk=THREE.ShaderChunk.shadowmap_pars_fragment.replace(
 /(#elif defined\( SHADOWMAP_TYPE_PCF_SOFT \))[\s\S]*?(#elif defined\( SHADOWMAP_TYPE_VSM \))/,
 `$1
 vec2 texelSize=vec2(1.0)/shadowMapSize;
 vec2 pixel=shadowCoord.xy*shadowMapSize-.5;
 vec2 fraction=fract(pixel);
 vec2 uv=(floor(pixel)+.5)*texelSize;
 shadow=mix(
  mix(texture2DCompare(shadowMap,uv,shadowCoord.z),texture2DCompare(shadowMap,uv+vec2(texelSize.x,0.0),shadowCoord.z),fraction.x),
  mix(texture2DCompare(shadowMap,uv+vec2(0.0,texelSize.y),shadowCoord.z),texture2DCompare(shadowMap,uv+texelSize,shadowCoord.z),fraction.x),fraction.y);
 $2`);

// Static world geometry needs one sun-depth bake. Camera culling must never trim
// its casters: nearby ground can be shaded by a tree outside the current view.
export function bakeForestShadows(renderer,scene,sun,visibility){
 const start=performance.now();visibility.restoreAll();
 scene.traverse(mesh=>{if(mesh.isMesh&&/boulders|pebbles/.test(mesh.name)){mesh.castShadow=true;mesh.receiveShadow=true;}});
 const materials=new Set();scene.traverse(mesh=>{if(mesh.isMesh&&mesh.receiveShadow)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(material);});
 for(const material of materials){const compile=material.onBeforeCompile,key=material.customProgramCacheKey();material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',forestShadowChunk);};material.customProgramCacheKey=()=>key+'-forest-shadow-four-tap-v1';material.needsUpdate=true;}
 sun.castShadow=true;sun.shadow.mapSize.set(Math.min(4096,renderer.capabilities.maxTextureSize),Math.min(4096,renderer.capabilities.maxTextureSize));
 sun.shadow.intensity=.78;sun.shadow.autoUpdate=false;
 const bounds=fitForestShadows(sun,scene);sun.shadow.bias=-.000005;sun.shadow.normalBias=.04;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 renderer.shadowMap.needsUpdate=true;sun.shadow.needsUpdate=true;
 // Use a tiny colour target while the full sun depth map is built once.
 const target=new THREE.WebGLRenderTarget(1,1),previous=renderer.getRenderTarget();
 const camera=new THREE.PerspectiveCamera(65,1,.1,200);camera.position.set(0,2,12);camera.lookAt(0,2,0);
 try{renderer.setRenderTarget(target);renderer.render(scene,camera);}finally{renderer.setRenderTarget(previous);target.dispose();}
 visibility.previousPosition.set(Infinity,Infinity,Infinity);
 return {mapSize:sun.shadow.mapSize.x,bakeCpuMs:+(performance.now()-start).toFixed(2),updates:1,filter:'four-tap PCF',worldCoverage:{minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z},cached:true};
}
