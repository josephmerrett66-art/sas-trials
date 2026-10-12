import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createForest} from '../forest-scene.js';
import {terrainHeight,WORLD_SIZE} from '../terrain.js';
import {START,bearing,gridReference,coordinates,makeCheckpoints,NavigationExercise} from '../navigation.js';
import {GamepadInput} from '../gamepad.js';
assert.equal(bearing(0),0);assert.equal(bearing(-Math.PI/2),90);assert.equal(bearing(Math.PI),180);assert.equal(bearing(Math.PI/2),270);assert.equal(bearing(Math.PI*4),0);assert.equal(gridReference(-WORLD_SIZE/2+1,-WORLD_SIZE/2+1),'A1');assert.equal(gridReference(WORLD_SIZE/2-1,WORLD_SIZE/2-1),'H8');
const obstacles=createForest(new THREE.Scene()),points=makeCheckpoints(obstacles),exercise=new NavigationExercise(points);
assert.equal(points.length,8);assert.deepEqual(exercise.revealed,[points[0]]);assert.deepEqual(coordinates({x:-WORLD_SIZE/2,z:WORLD_SIZE/2}),{east:0,north:0});
assert.ok(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))>WORLD_SIZE*.6);assert.ok(Math.max(...points.map(p=>p.z))-Math.min(...points.map(p=>p.z))>WORLD_SIZE*.6);
let routeDistance=Math.hypot(points[0].x-START.x,points[0].z-START.z);for(let i=1;i<points.length;i++){const leg=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);assert.ok(leg>WORLD_SIZE*.3);routeDistance+=leg;}assert.ok(routeDistance>5000);
// The course must require new bearings, not a predictable cardinal perimeter.
const sectors=new Set();
for(let i=1;i<points.length;i++){const dx=points[i].x-points[i-1].x,dz=points[i].z-points[i-1].z,leg=Math.hypot(dx,dz);assert(Math.min(Math.abs(dx),Math.abs(dz))/leg>.2,'Every leg needs substantial progress on both axes');sectors.add((Math.round(Math.atan2(dx,-dz)*180/Math.PI/45)+8)%8);assert(points[i].description.includes(points[i].grid),'Mission log grid agrees with actual site');}
assert(sectors.size>=5,'Legs cover a varied range of bearings');assert(points.filter(p=>Math.abs(p.x)<WORLD_SIZE*.28&&Math.abs(p.z)<WORLD_SIZE*.28).length>=3,'Several controls are inside the forest rather than along its perimeter');
for(const p of points){assert.equal(p.y,terrainHeight(p.x,p.z));assert.ok(obstacles.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>o.radius+1.3));}
const player={...START,y:0};assert.equal(exercise.interact(player),false);Object.assign(player,points[1]);assert.equal(exercise.interact(player),false);assert.equal(exercise.stage,0);assert.deepEqual(exercise.revealed,[points[0]]);
Object.assign(player,points[0]);player.y+=10;assert.equal(exercise.interact(player),false);player.y-=10;
for(const [i,p] of points.entries()){assert.equal(exercise.current,p);Object.assign(player,p);assert.equal(exercise.interact(player),true);assert.equal(exercise.revealed.length,Math.min(i+2,points.length));assert.equal(exercise.current,points[i+1]??null);}assert.equal(exercise.complete,true);assert.equal(exercise.interact(player),false);exercise.reset();assert.equal(exercise.stage,0);assert.equal(exercise.distance,0);assert.deepEqual(exercise.revealed,[points[0]]);
Object.assign(player,START);exercise.step(1,player);player.x+=3;player.z+=4;exercise.step(1,player);assert.equal(exercise.distance,5);exercise.reset();assert.equal(exercise.elevation,0);
const pad={connected:true,mapping:'standard',index:0,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};const input=new GamepadInput();input.read([pad]);pad.buttons[8].pressed=true;assert.equal(input.read([pad]).mapPressed,true);assert.equal(input.read([pad]).mapPressed,false);
console.log('Passed compass cardinal bearings, north-oriented grid, accessible terrain-grounded posts, ordered proximity/height interaction, completion/reset, travel accounting and Xbox map edge.');console.log(points.map(p=>({code:p.code,x:p.x,z:p.z,y:p.y,grid:p.grid})));
