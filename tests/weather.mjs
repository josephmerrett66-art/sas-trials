import assert from 'node:assert/strict';
import {WeatherState} from '../weather-state.js';
const state=new WeatherState();const modes=new Set();
for(let i=0;i<3200;i++){state.step(.1);modes.add(state.current);for(const v of [state.rain,state.wind,state.cloud,state.gust,state.flash])assert.ok(Number.isFinite(v)&&v>=0&&v<=1);}
assert.deepEqual([...modes].sort(),['clear','rain','storm','wind']);
state.setMode('storm');let strikes=0;for(let i=0;i<600;i++){state.step(.1);if(state.strike)strikes++;}assert.ok(strikes>=2&&strikes<=3);assert.ok(state.rain>.99);assert.ok(state.wind>.99);
const time=state.time;for(let i=0;i<100;i++)state.step(.1,false);assert.equal(state.time,time);assert.equal(state.flash,0);
state.setMode('storm');let quietStrikes=0;for(let i=0;i<600;i++){state.step(.1,true,false);if(state.strike)quietStrikes++;assert.equal(state.flash,0);}assert.ok(quietStrikes>=2);
state.setMode('clear');for(let i=0;i<200;i++)state.step(.1);assert.ok(state.rain<.002);assert.ok(state.wind<.002);assert.throws(()=>state.setMode('snow'));
console.log('Passed weather cycling, bounded transition/gust strength, spaced lightning, pause, flash disable and clearing.');
const THREE=await import('../vendor/three.module.js');
const {ForestWeather}=await import('../weather.js');
const scene=new THREE.Scene();scene.background=new THREE.Color();scene.fog=new THREE.Fog(0,35,90);
const camera=new THREE.PerspectiveCamera(),weather=new ForestWeather(scene,camera,'storm'),sun=new THREE.DirectionalLight(),hemi=new THREE.HemisphereLight(),visibility={previousFov:85,maxDistance:92};
const positions=weather.rainMesh.geometry.attributes.position.array;
for(let i=0;i<1800;i++){weather.step(1/60,true,false,true,sun,hemi,visibility);assert.ok(weather.rainMesh.geometry.drawRange.count<=1280);assert.equal(weather.rainMesh.geometry.attributes.position.array,positions);assert.ok(Number.isFinite(scene.fog.far));}
assert.equal(scene.children.length,1);assert.equal(scene.children.filter(o=>o.isLight).length,0);assert.equal(weather.rainMesh.material.depthWrite,false);assert.ok(visibility.maxDistance<70);
weather.state.setMode('clear');for(let i=0;i<1500;i++)weather.step(1/60,true,true,false,sun,hemi,visibility);assert.equal(weather.rainMesh.visible,false);assert.equal(sun.intensity,0);assert.equal(hemi.intensity,0);assert.equal(scene.background.getHex(),0);
console.log('Passed fixed rain capacity, buffer reuse, fog bounds, existing-light reuse, clearing and dark-night lighting.');
