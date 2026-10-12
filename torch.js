import * as THREE from './vendor/three.module.js';

// A handheld reflector flashlight: one world-space light with a soft spill
// and concentrated hot spot. No screen mask, extra geometry or render pass.
export class ForestTorch {
 constructor(camera){
  this.dark=true;this.on=true;this.level=1;this.darkness=1;
  this.light=new THREE.SpotLight(0xfff1dc,0,55,.62,.85,1.8);
  this.light.position.set(-.18,-.22,-.35);this.light.castShadow=false;
  this.target=new THREE.Object3D();this.target.position.set(0,-.45,-20);
  camera.add(this.light,this.target);this.light.target=this.target;
  this.time=0;this.lagX=0;this.lagY=0;this.lastYaw=null;this.lastPitch=0;
 }
 toggle(){this.on=!this.on;return this.on;}
 // darkness 0..1; the torch only throws light as daylight fades.
 setDark(value){this.darkness=Math.max(0,Math.min(1,Number(value)));this.dark=this.darkness>.5;}
 step(dt,player){
  dt=Math.min(.05,Math.max(0,dt));this.time+=dt;
  this.level+=((this.on?1:0)-this.level)*(1-Math.exp(-35*dt));
  if(player&&typeof player==='object'){
   if(this.lastYaw!==null){
    const yaw=Math.atan2(Math.sin(player.yaw-this.lastYaw),Math.cos(player.yaw-this.lastYaw));
    this.lagX=THREE.MathUtils.clamp(this.lagX+yaw*12,-.7,.7);
    this.lagY=THREE.MathUtils.clamp(this.lagY-(player.pitch-this.lastPitch)*12,-.5,.5);
   }
   this.lastYaw=player.yaw;this.lastPitch=player.pitch;
  }
  const settle=Math.exp(-10*dt);this.lagX*=settle;this.lagY*=settle;
  const speed=player&&typeof player==='object'?Math.min(1,Math.hypot(player.vx,player.vz)/6):0;
  const stride=player&&typeof player==='object'?player.travel*2.6:0;
  this.target.position.set(this.lagX+Math.sin(stride)*.09*speed+Math.sin(this.time*1.3)*.018,-.45+this.lagY+Math.cos(stride*2)*.065*speed,-20);
  this.light.intensity=this.level*210*Math.min(1,Math.max(0,(this.darkness-.25)/.6));return this.darkness;
 }
}

export function installTorchOptics(scene){
 const materials=new Set();
 scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
 // Preserve Three's circular cone and distance attenuation. Model the reflector's
 // central hot spot inside its dimmer, smoothly feathered surrounding spill.
 const chunk=THREE.ShaderChunk.lights_pars_begin.replace(
  'float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );',
  'float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos ) * ( .22 + .78 * smoothstep( .955, .997, angleCos ) );');
 for(const material of materials){
  const compile=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);for(const key of ['vertexShader','fragmentShader'])shader[key]=shader[key].replace('#include <lights_pars_begin>',chunk);};
  material.customProgramCacheKey=()=>cacheKey+'-torch-reflector-v1';material.needsUpdate=true;
 }
}
