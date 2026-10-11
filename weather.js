import * as THREE from './vendor/three.module.js';
import {WeatherState} from './weather-state.js?v=weather-3';
export class ForestWeather {
 constructor(scene,camera,mode='auto'){
  this.scene=scene;this.camera=camera;this.state=new WeatherState(mode);this.volume=.5;this.lightning=true;this.time={value:0};this.wind={value:0};this.drift={value:0};this.origin={value:new THREE.Vector3()};this.aim={value:new THREE.Vector3(0,0,-1)};this.night={value:0};this.torch={value:1};this.clear=new THREE.Color(0x9cbdd0);this.grey=new THREE.Color(0x66737b);this.previousFar=0;this.thunderAt=Infinity;this.audio=null;this.audioTick=0;
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
 unlockAudio(context){
  if(this.audio||!context)return;this.audio=context;
  const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;this.noise=buffer;
  const loop=(type,frequency)=>{const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=frequency;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start();return gain;};
  this.windGain=loop('lowpass',320);this.rainGain=loop('highpass',1400);
 }
 thunder(){const context=this.audio;if(!context||context.state!=='running'||this.volume<=0)return;const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=this.noise;filter.type='lowpass';filter.frequency.value=110;const now=context.currentTime;gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(this.volume*.9,now+.18);gain.gain.exponentialRampToValueAtTime(.001,now+2.9);source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};}
 step(dt,active,night,torchOn,sun,hemisphere,visibility){
  const s=this.state;s.step(dt,active,this.lightning);this.time.value=s.rain>.02||s.gust>.01?s.time:0;this.wind.value=s.gust;this.drift.value=(this.drift.value-(active?s.gust*16*dt:0))%40;this.night.value=night?1-s.flash:0;this.torch.value=torchOn?1:0;
  this.rainMesh.visible=s.rain>.02;this.rainMesh.geometry.setDrawRange(0,Math.floor(640*s.rain)*2);this.rainMesh.material.opacity=.36*s.rain;if(this.rainMesh.visible){this.origin.value.copy(this.camera.position);if(night)this.camera.getWorldDirection(this.aim.value);}
  sun.intensity=(night?0:1.7*(1-s.cloud*.75))+s.flash*.6;hemisphere.intensity=(night?0:1.2*(1-s.cloud*.4))+s.flash*.65;
  if(night)this.scene.background.setRGB(s.flash*.15,s.flash*.18,s.flash*.22);else this.scene.background.copy(this.clear).lerp(this.grey,s.cloud);
  this.scene.fog.color.copy(this.scene.background);this.scene.fog.near=(night?22:35)-s.cloud*13;this.scene.fog.far=(night?45:90)-s.cloud*(night?10:25);visibility.maxDistance=this.scene.fog.far+2;if(Math.abs(this.scene.fog.far-this.previousFar)>1){visibility.previousFov=0;this.previousFar=this.scene.fog.far;}
  if(s.strike)this.thunderAt=s.time+1.8;if(active&&s.time>=this.thunderAt){this.thunderAt=Infinity;this.thunder();}
  this.audioTick+=dt;if(this.audio&&this.audioTick>=.1){this.audioTick=0;this.windGain.gain.setTargetAtTime(active?s.gust*this.volume*.2:0,this.audio.currentTime,.2);this.rainGain.gain.setTargetAtTime(active?s.rain*this.volume*.11:0,this.audio.currentTime,.2);}
 }
}
