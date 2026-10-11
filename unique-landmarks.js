import * as THREE from './vendor/three.module.js';
import {buildLandmark} from './landmark-builder.js?v=1';
import {CONTROL_LANDMARKS} from './control-landmarks.js?v=1';
import {terrainHeight} from './terrain.js?v=gullies-1';
const rust=0x8e5133,wood=0x6f5031,dark=0x292f2a,stone=0x8e9285,metal=0x555b58,blue=0x426975;
const builders={
 tank({box,part}){
  for(const x of [-1.35,1.35])for(const z of [-1.35,1.35])box(.2,2.8,.2,metal,x,1.4,z);
  part(new THREE.CylinderGeometry(1.8,1.8,2.25,12),rust,0,3.75,0);
  part(new THREE.ConeGeometry(1.9,.6,12),metal,0,5.18,0);
  for(const y of [2.68,3.78,4.85])part(new THREE.TorusGeometry(1.81,.07,4,12),metal,0,y,0,Math.PI/2);
  for(const z of [-.35,.35])box(.09,4.5,.09,metal,2.02,2.25,z);
  for(let y=.3;y<4.5;y+=.4)box(.09,.06,.8,metal,2.02,y,0);
  box(.24,.24,.65,rust,1.9,3.2,.65);
 },
 cabin({box}){
  box(6,.18,4.6,dark,0,.12,0);
  for(let y=.4;y<2.8;y+=.27){box(.22,.22,4.6,wood,-2.8,y,0);if(y<1.8)box(.22,.22,4.6,wood,2.8,y,0);box(5.8,.22,.22,wood,0,y,-2.2);box(1.85,.22,.22,wood,-1.95,y,2.2);box(1.85,.22,.22,wood,1.95,y,2.2);}
  box(1.25,.12,4.8,wood,-2.18,3.12,0,0,0,.35);box(2.1,.12,3.7,dark,.6,1.05,.1,.18,0,-.25);
  box(.16,.18,4.9,wood,0,3.5,0);for(const z of [-2,0,2])box(3.2,.15,.15,wood,-1.45,3.1,z,0,0,.32);
  for(let y=.3;y<4.25;y+=.3)box(.95,.26,.85,y%1<.5?0x8a604b:0x9e7460,1.8,y,-1.35);
  box(2.05,.23,.3,wood,0,2.75,2.2);box(1.4,.1,.95,stone,0,.1,2.7);
 },
 well({box,part}){
  for(let row=0;row<4;row++)for(let i=0;i<12;i++){const a=(i+(row%2)*.5)*Math.PI/6;box(.67,.3,.42,i%3?stone:0x686d65,Math.sin(a)*1.35,.15+row*.3,Math.cos(a)*1.35,0,a);}
  part(new THREE.CylinderGeometry(1.03,1.03,.08,12),dark,0,.15,0);
  for(const x of [-1.65,1.65])box(.2,3.15,.2,wood,x,1.58,0);box(3.7,.23,.23,wood,0,3.2,0);
  box(.08,1.45,.08,0xaca17d,1.62,2.4,0);
  part(new THREE.CylinderGeometry(.28,.22,.4,8,true),metal,1.62,1.46,0);part(new THREE.TorusGeometry(.25,.025,4,8,Math.PI),metal,1.62,1.8,0);
 },
 plane({box,part}){
  const yellow=0xb6a45d;
  part(new THREE.CylinderGeometry(.58,.28,4.7,8),0xb6b7a6,0,1.12,.15,Math.PI/2);
  box(10,.12,1.75,yellow,0,.9,-.25,0,0,.04);box(3,.13,.85,yellow,0,1.08,2.5);
  box(.12,1.2,.9,yellow,0,1.65,2.36,0,0,.1);box(.8,.5,1.1,dark,0,1.67,-.72,.18);
  box(2.2,.12,.13,metal,0,1.12,-2.34,0,0,.55);box(.13,.12,2.2,metal,0,1.12,-2.35,Math.PI/2,0,.55);
  for(const x of [-.75,.75])part(new THREE.CylinderGeometry(.34,.34,.22,8),dark,x,.34,.35,0,0,Math.PI/2);
  box(1.1,.08,.65,0x704a32,3.4,.98,-.18);box(.8,.07,.9,dark,-3,.98,-.25);
 },
 boat({box,part}){
  const hull=new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2);hull.scale(3,.95,1.05);part(hull,blue,0,.12,0);
  box(5.25,.14,.18,wood,0,1.08,0);for(const x of [-1.8,-.9,0,.9,1.8]){const rib=new THREE.TorusGeometry(1,.05,4,10,Math.PI);rib.scale(1,.92,1);part(rib,wood,x,.15,0,0,Math.PI/2);}
  box(5.35,.1,.13,wood,0,.14,-1);box(5.35,.1,.13,wood,0,.14,1);box(1.2,.04,.2,0x8c7048,.9,.89,.36,0,0,.03);
 },
 mast({box,part}){
  box(3.5,.22,3.5,stone,0,.11,0);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3,x=Math.sin(a),z=Math.cos(a);for(let j=0;j<6;j++)box(.14,1.05,.14,j%2?0xc5bbaa:0x884738,x*(1-j*.12),.8+j,z*(1-j*.12));}
  for(let y=1;y<6;y+=1)for(let i=0;i<3;i++){const a=i*Math.PI*2/3;box(1.7-y*.17,.08,.08,metal,Math.sin(a)*.4,y,Math.cos(a)*.4,0,a);}
  box(.9,.12,.9,metal,0,6.25,0);box(.15,1.4,.15,metal,.5,6.7,0,0,0,-.65);box(2.9,.06,.07,metal,1.15,7.1,0,0,0,.23);
  for(const x of [-.1,.6,1.3,2])box(.045,.045,1.4,metal,x,7.1,0);box(1.1,1.35,.7,blue,0,.78,1.6);box(.65,.4,.04,dark,0,1.1,1.97);
 }
};
export function createUniqueLandmarks(scene,obstacles){
 const materialMeshes=[];
 for(const control of CONTROL_LANDMARKS){materialMeshes.push(buildLandmark(scene,control.name,control.feature,builders[control.kind]));const {x,z}=control.feature;obstacles.push({x,z,baseY:terrainHeight(x,z),radius:control.radius,height:control.height});
  if(control.kind==='plane')for(const offset of [-3.5,3.5])obstacles.push({x:x+offset,z,baseY:terrainHeight(x+offset,z),radius:1.1,height:1});
 }
 return materialMeshes;
}
