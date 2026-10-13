import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FBXLoader} from '../vendor/FBXLoader.js';
FBXLoader.prototype.loadAsync=async function(path){const data=fs.readFileSync(path);return this.parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');};
import * as THREE from '../vendor/three.module.js';
import {defaults} from '../controller.js';
import {HeldNavigation} from '../held-navigation.js';
// Canvas drawing is irrelevant to the magnetic orientation regression.
const context=new Proxy({}, {get:(o,key)=>o[key]??(()=>{})});
globalThis.document={createElement:()=>({width:256,height:256,getContext:()=>context,addEventListener(){}})};
const camera=new THREE.PerspectiveCamera(defaults.fov,1200/769,.05,900);camera.rotation.order='YXZ';
const rig=new HeldNavigation(camera,document.createElement('canvas')),north=new THREE.Vector3(0,0,-1),needle=new THREE.Vector3(),origin=new THREE.Vector3(),local=new THREE.Vector3();
await rig.ready;
const draws=[];rig.root.traverse(o=>{if(o.isMesh)draws.push(o);});assert.equal(rig.headingIndex.geometry.type,'PlaneGeometry','reference compass has a rectangular baseplate');assert(rig.headingIndex.material.transparent,'baseplate is clear');assert.equal(draws.length,6,'original arms use one shared-material draw, equipment uses five');
for(const yaw of [0,-Math.PI/2,Math.PI,Math.PI/2,12*Math.PI+.63])for(const pitch of [-1.1,-.4,0])for(const roll of [0,.05,-.08]){
 camera.rotation.set(pitch+.025,yaw,roll);rig.update({yaw,pitch});camera.updateMatrixWorld(true);
 const error=Math.atan2(Math.sin(rig.dial.rotation.z+yaw),Math.cos(rig.dial.rotation.z+yaw));assert.ok(Math.abs(error)<1e-6,'dial uses camera horizontal heading, independent of dial tilt and camera roll');
 assert.equal(rig.dial.rotation.z,rig.needle.rotation.z,'N stays under the red tip');assert.equal(rig.headingIndex.rotation.z,0,'forward marker never rotates');
}
for(const [yaw,heading] of [[0,0],[-Math.PI/2,Math.PI/2],[Math.PI,Math.PI],[Math.PI/2,-Math.PI/2]]){camera.rotation.set(-1,yaw,0);rig.update({yaw,pitch:-1});const error=Math.atan2(Math.sin(rig.dial.rotation.z-heading),Math.cos(rig.dial.rotation.z-heading));assert.ok(Math.abs(error)<.00001,'fixed forward index reads N/E/S/W correctly');}
camera.rotation.set(0,-Math.PI/2,0);rig.update({yaw:0,pitch:0});assert.equal(rig.heading.degrees,90,'camera heading takes priority over player yaw');
rig.update({yaw:0,pitch:0},0,null,false);assert.equal(rig.root.visible,false);
console.log('Passed shared camera heading, fixed forward marker, cardinal dial/needle positions, pitch/roll independence and six-draw budget.');

const player={yaw:0,pitch:0,vx:0,vz:0,grounded:true,slide:0,state:'GROUNDED',config:{walk:6,sprint:9.5}},feel={dip:0};
assert.equal(rig.arms.mesh.geometry.attributes.position.count,1608,'reuse the original FBX arms geometry');
const meshList=[];rig.arms.model.traverse(o=>{if(o.isMesh)meshList.push(o);});assert.deepEqual(meshList.map(o=>o.name),['Arms_Mesh'],'weapons are absent from the navigation rig');
const geometry=rig.arms.mesh.geometry,material=rig.arms.mesh.material;
rig.update(player,1/60,feel,true);const idleHeight=rig.map.position.y;
player.vz=-9.5;player.state='SPRINTING';
let maxProjected=-Infinity;
for(let i=0;i<120;i++){
 rig.update(player,1/60,feel,true);camera.rotation.set(0,0,0);camera.updateMatrixWorld(true);
 const vertex=new THREE.Vector3();for(let j=0;j<rig.map.children[0].geometry.attributes.position.count;j++){
  vertex.fromBufferAttribute(rig.map.children[0].geometry.attributes.position,j);rig.map.localToWorld(vertex);vertex.project(camera);maxProjected=Math.max(maxProjected,vertex.y);
 }
}
assert.ok(maxProjected<-.65,'chart stays below the useful forward view throughout the running cycle');
assert.equal(rig.arms.current,rig.arms.actions.Run,'sprint selects the original gun running clip');
assert.ok(rig.map.position.y<idleHeight-.1,'running lowers the held chart farther');
// Every chart vertex remains at the bottom of (or beneath) the forward viewport.
for(let i=0;i<rig.map.children[0].geometry.attributes.position.count;i++){
 const v=new THREE.Vector3().fromBufferAttribute(rig.map.children[0].geometry.attributes.position,i);rig.map.localToWorld(v);v.project(camera);assert.ok(v.y<-.65,'forward-running chart is unreadable below the main view');
}
player.pitch=-1.05;camera.rotation.x=player.pitch;rig.update(player,1/60,feel,true);camera.updateMatrixWorld(true);
const centre=rig.map.getWorldPosition(new THREE.Vector3()).project(camera);assert.ok(Math.abs(centre.x)<.6&&Math.abs(centre.y)<.6,'look down brings the chart back into readable view');
player.pitch=0;camera.rotation.set(0,0,0);camera.fov=defaults.fov;camera.updateProjectionMatrix();
rig.update(player,1/60,feel,true);assert.equal(rig.root.visible,true,'equipment stays out while running');assert.equal(rig.map.visible,true);assert.equal(rig.compass.visible,true);
for(let i=0;i<60;i++)rig.update(player,1/60,feel,true);
assert.equal(rig.arms.model.position.z,-.15,'always uses the holding pose, never the unarmed pose');
assert.strictEqual(rig.arms.mesh.geometry,geometry);assert.strictEqual(rig.arms.mesh.material,material);
const time=rig.arms.mixer.time;rig.update(player,0,feel,false);assert.equal(rig.arms.mixer.time,time,'pause does not advance the running clip');
console.log('Passed original gun-arm reuse without weapons, native running clip, low running chart, look-down inspection, always-held equipment and paused/reused animation.');

// Field actions: one prop mesh plays each gesture, hides the map while it does, then puts it back.
import {GESTURES,poseGesture,propGeometries} from '../field-props.js';
{
 const props=propGeometries();for(const [name,g] of Object.entries(GESTURES)){assert.ok(props[g.prop],`${name} has a prop`);assert.ok(g.time>0&&g.time<=1.2,`${name} is quick`);assert.ok(g.keys.length>=2);}
 for(const [name,geometry] of Object.entries(props)){geometry.computeBoundingSphere();assert.ok(geometry.boundingSphere.radius<.7,`${name} is hand-sized`);assert.ok(geometry.attributes.color,`${name} is vertex coloured`);}
 const o=new THREE.Object3D(),g=GESTURES.drink;poseGesture(g,0,o);assert.deepEqual(o.position.toArray(),g.keys[0].slice(0,3));poseGesture(g,1,o);for(let i=0;i<3;i++)assert.ok(Math.abs(o.position.getComponent(i)-g.keys[2][i])<1e-6,'ends on the last key');
 const player={pitch:-.3,vx:0,vz:0,grounded:true,state:'IDLE',config:defaults};const before=camera.children.filter(c=>c.isMesh).length;
 rig.gesture('strike');rig.update(player,.1);assert.equal(rig.prop.visible,true);assert.equal(rig.prop.geometry,rig.props.steel,'the fire steel is in hand');assert.equal(rig.map.visible,false,'the map is put away for a moment');
 rig.update(player,.5);assert.equal(rig.prop.visible,false,'the gesture ends');assert.equal(rig.map.visible,true);
 rig.gesture('eat-rabbit');rig.hold('pitch',.5);rig.update(player,.1);assert.equal(rig.prop.geometry,rig.props.branch,'a hold takes over from a gesture');rig.hold(null);rig.update(player,.1);assert.equal(rig.prop.visible,false);
 rig.gesture('no-such-thing');rig.update(player,.1);assert.equal(rig.prop.visible,false);
 assert.equal(camera.children.filter(c=>c.isMesh).length,before,'no meshes are added while acting');assert.equal(before,1,'all props share one mesh');
 console.log('Passed field-action gestures: every prop exists and is hand-sized, poses ease between keys, one shared prop mesh.');
}
