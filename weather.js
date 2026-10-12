import * as THREE from './vendor/three.module.js';
import {WeatherState} from './weather-state.js?v=weather-3';
export class ForestWeather {
 constructor(scene,camera,mode='auto'){
  this.scene=scene;this.camera=camera;this.state=new WeatherState(mode);this.volume=.5;this.lightning=true;this.time={value:0};this.wind={value:0};this.drift={value:0};this.origin={value:new THREE.Vector3()};this.aim={value:new THREE.Vector3(0,0,-1)};this.night={value:0};this.torch={value:1};this.clear=new THREE.Color(0x9cbdd0);this.grey=new THREE.Color(0x66737b);this.dusk=new THREE.Color(0xe0a278);this.twilight=new THREE.Color(0x26324a);this.sunDay=new THREE.Color(0xffe0ac);this.sunLow=new THREE.Color(0xff9c5e);this.previousFar=0;
  // All foliage reuses uniforms; sway stays inside the culling sphere's .35 m padding.
  scene.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(m.userData.surface!=='foliage')return;const compile=m.onBeforeCompile,key=m.customProgramCacheKey();m.onBeforeCompile=(shader,renderer)=>{compile.call(m,shader,renderer);shader.uniforms.weatherTime=this.time;shader.uniforms.weatherWind=this.wind;shader.vertexShader='uniform float weatherTime; uniform float weatherWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   if(weatherWind>.001){float phase=vSurfaceWorld.x*.17+vSurfaceWorld.z*.11;float sway=sin(weatherTime*2.5+phase)*.22*weatherWind*clamp(position.y+.5,0.0,1.0);mvPosition.xyz+=mat3(viewMatrix)*vec3(sway,0.0,sway*.35);gl_Position=projectionMatrix*mvPosition;}
  `);};m.customProgramCacheKey=()=>key+'-weather-sway-v1';m.needsUpdate=true;});
  const count=640,positions=new Float32Array(count*6),tips=new Float32Array(count*2);let seed=9857;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){const x=(random()-.5)*40,y=random()*18,z=(random()-.5)*40;for(let tip=0;tip<2;tip++){const offset=i*6+tip*3;positions[offset]=x;positions[offset+1]=y;positions[offset+2]=z;tips[i*2+tip]=tip;}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('rainTip',new THREE.BufferAttribute(tips,1));
  const material=new THREE.LineBasicMaterial({color:0xaec5cf,transparent:true,opacity:.4,depthWrite:false});
  material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,{weatherTime:this.time,weatherWind:this.wind,weatherDrift:this.drift,rainOrigin:this.origin,rainAim:this.aim,rainNight:this.night,rainTorch:this.torch});shader.vertexShader='attribute float rainTip; uniform float weatherTime;uniform float weatherWind;uniform float weatherDrift;uniform vec3 rainOrigin;varying vec3 vRainWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float drop=mod(position.y-weatherTime*19.0-rainOrigin.y,18.0);float tilt=weatherWind*1.2;
   transformed=vec3(mod(position.x+weatherDrift-rainOrigin.x+20.0,40.0)-20.0-rainTip*tilt*.75,drop-6.0+rainTip*.75,mod(position.z-rainOrigin.z+20.0,40.0)-20.0)+rainOrigin;vRainWorld=transformed;
  `);shader.fragmentShader='uniform vec3 rainOrigin;uniform vec3 rainAim;uniform float rainNight;uniform float rainTorch;varying vec3 vRainWorld;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   if(rainNight>.001){vec3 relative=vRainWorld-rainOrigin;float beam=smoothstep(.88,.98,dot(normalize(relative),rainAim))*rainTorch;diffuseColor.a*=mix(1.0,beam*.65,rainNight);}
  `);};material.customProgramCacheKey=()=> 'weather-rain-v1';
  this.rainMesh=new THREE.LineSegments(geometry,material);this.rainMesh.name='Local weather rain';this.rainMesh.frustumCulled=false;this.rainMesh.visible=false;scene.add(this.rainMesh);
 }
 // dark: 0 day to 1 night; dusk: 0..1 warmth of a low sun.
 step(dt,active,dark,torchOn,sun,hemisphere,visibility,dusk=0){
  dark=Number(dark);const night=dark>.5;
  const s=this.state;s.step(dt,active,this.lightning);this.time.value=s.rain>.02||s.gust>.01?s.time:0;this.wind.value=s.gust;this.drift.value=(this.drift.value-(active?s.gust*16*dt:0))%40;this.night.value=dark*(1-s.flash);this.torch.value=torchOn?1:0;
  this.rainMesh.visible=s.rain>.02;this.rainMesh.geometry.setDrawRange(0,Math.floor(640*s.rain)*2);this.rainMesh.material.opacity=.36*s.rain;if(this.rainMesh.visible){this.origin.value.copy(this.camera.position);if(dark>.05)this.camera.getWorldDirection(this.aim.value);}
  const day=1-dark,low=dusk*(1-s.cloud*.7);
  sun.intensity=1.7*(1-s.cloud*.75)*day*(1-.35*low)+s.flash*.6;hemisphere.intensity=1.2*(1-s.cloud*.4)*day+s.flash*.65;
  // A low sun turns warm; twilight fades the sky towards black through a dusky blue.
  sun.color.copy(this.sunDay).lerp(this.sunLow,low);
  this.scene.background.copy(this.clear).lerp(this.grey,s.cloud).lerp(this.dusk,low*.55).multiplyScalar(day*day).lerp(this.twilight,Math.sin(Math.PI*Math.min(1,dark))*(1-s.cloud)*.5);this.scene.background.r+=s.flash*.15*dark;this.scene.background.g+=s.flash*.18*dark;this.scene.background.b+=s.flash*.22*dark;
  this.scene.fog.color.copy(this.scene.background);this.scene.fog.near=35-13*dark-s.cloud*13;this.scene.fog.far=90-45*dark-s.cloud*(25-15*dark);visibility.maxDistance=this.scene.fog.far+2;if(Math.abs(this.scene.fog.far-this.previousFar)>1){visibility.previousFov=0;this.previousFar=this.scene.fog.far;}
 }
}
