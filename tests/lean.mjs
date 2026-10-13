import assert from 'node:assert/strict';
import {PlayerLean,leanInput} from '../lean.js';
import {Controller} from '../controller.js';
import {GamepadInput} from '../gamepad.js';
const player=new Controller();player.x=player.z=0;player.config.size=1;player.eye=1.7;
const lean=new PlayerLean(),out=lean.output;
for(let i=0;i<120;i++)lean.step(1/120,1,player,[]);
assert.ok(out.x>.359&&out.roll<-.159,'right lean moves head and rolls');assert.equal(player.x,0,'body stays in place');
for(let i=0;i<120;i++)lean.step(1/120,-1,player,[]);assert.ok(out.x<-.359&&out.roll>.159);
for(let i=0;i<120;i++)lean.step(1/120,0,player,[]);assert.ok(Math.abs(out.x)<.00001,'release recentres');
lean.reset();for(let i=0;i<120;i++)lean.step(1/120,1,player,[{x:.4,z:0,radius:.1,height:3}]);assert.ok(out.x<=.116,'head stops before wall');assert.ok(Math.abs(out.roll)<.06,'blocked lean reduces tilt');
lean.step(.05,1,player,[{x:.4,z:0,radius:.1,height:.5}]);assert.ok(out.x>.35,'low objects do not block head');
player.yaw=Math.PI/2;lean.step(.05,1,player,[]);assert.ok(out.z<-.35&&Math.abs(out.x)<.00001,'offset rotates with aim');
player.state='SPRINTING';for(let i=0;i<120;i++)lean.step(1/120,1,player,[]);assert.ok(Math.abs(out.z)<.00001,'sprint recentres');assert.equal(out,lean.output);
const pad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0})),id:'test'};pad.buttons[4].pressed=true;assert.equal(new GamepadInput().read([pad]).leanLeft,true);pad.buttons[5].pressed=true;assert.equal(new GamepadInput().read([pad]).leanRight,true);
console.log('Passed lean direction, rotation, neutral recovery, collision clearance, low obstacles, sprint cancellation and Xbox controls.');

import * as THREE from '../vendor/three.module.js';
import {ForestVisibility} from '../forest-visibility.js';
const visibility=new ForestVisibility(new THREE.Scene()),camera=new THREE.PerspectiveCamera();visibility.update(camera);camera.rotation.z=.16;visibility.update(camera);assert.equal(visibility.previousRotation.z,.16,'lean roll refreshes the culling frustum');
console.log('Passed lean camera-roll visibility refresh.');

assert.equal(leanInput(new Set(),null),0);assert.equal(leanInput(new Set(['KeyQ']),null),-1);assert.equal(leanInput(new Set(['KeyE']),null),1);assert.equal(leanInput(new Set(['KeyQ','KeyE']),null),0);assert.equal(leanInput(new Set(),{leanRight:true}),1);assert.equal(leanInput(new Set(),{}),0);
console.log('Passed neutral keyboard input without a connected controller.');
