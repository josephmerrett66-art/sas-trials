import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {branchGeometry,stickGeometry,hatchetGeometry} from './forest-floor.js?v=fire-1';
import {rabbitGeometry} from './wildlife.js?v=warrens-1';

// Small things held in the right hand for a moment as you use them, in the same faceted,
// vertex-coloured style as the world. Each is centred on the grip, about hand-sized, and built
// once; one mesh swaps between them, so a held prop is never more than one extra draw.
const tint=(geometry,color)=>{geometry=geometry.index?geometry.toNonIndexed():geometry;for(const k of Object.keys(geometry.attributes))if(k!=='position')geometry.deleteAttribute(k);const c=new THREE.Color(color),n=geometry.attributes.position.count,colors=new Float32Array(n*3);for(let i=0;i<n;i++)c.toArray(colors,i*3);geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;};
const place=(geometry,x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>{const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.scale.set(sx,sy,sz);o.updateMatrix();return geometry.applyMatrix4(o.matrix);};

// A handful of dry grass: pale blades fanning out of the fist.
function tinderGeometry(){
 const parts=[];for(let i=0;i<9;i++){const a=i/9*Math.PI*2,lean=.25+(i%3)*.12;parts.push(tint(place(new THREE.ConeGeometry(.008,.2+(i%4)*.03,3),Math.cos(a)*.015,.1,Math.sin(a)*.015,Math.sin(a)*lean,0,-Math.cos(a)*lean),i%2?0xcdb874:0xb9a35f));}
 parts.push(tint(place(new THREE.CylinderGeometry(.03,.025,.05,6),0,0,0),0xa8935a));
 return mergeGeometries(parts);
}
// Three split logs about half a metre long, tied with a band.
function woodGeometry(){
 const parts=[];for(const [x,y,c] of [[-.045,0,0x6f4f33],[.045,0,0x5c412a],[0,.07,0x7a5a3a]])parts.push(tint(place(new THREE.CylinderGeometry(.04,.045,.5,6),x,y,0,Math.PI/2),c));
 parts.push(tint(place(new THREE.TorusGeometry(.085,.008,3,8),0,.03,.05),0xb7a77d));
 return mergeGeometries(parts);
}
// Fire steel: a dark ferro rod in a wooden handle, with the striker held against it.
function steelGeometry(){
 return mergeGeometries([
  tint(place(new THREE.CylinderGeometry(.012,.014,.07,6),0,-.04,0),0x6f4f33),
  tint(place(new THREE.CylinderGeometry(.007,.007,.1,6),0,.045,0),0x3f4245),
  tint(place(new THREE.BoxGeometry(.05,.012,.004),.02,.07,.012,0,0,-.5),0xc2c6c8)
 ]).scale(1.6,1.6,1.6);
}
// An olive water bottle with a black cap.
function bottleGeometry(){
 return mergeGeometries([
  tint(place(new THREE.CylinderGeometry(.036,.036,.17,8),0,0,0),0x4d5a3a),
  tint(place(new THREE.CylinderGeometry(.018,.022,.03,8),0,.1,0),0x22231f)
 ]);
}
// A ration pack: a khaki pouch.
function rationGeometry(){
 return mergeGeometries([tint(place(new THREE.BoxGeometry(.1,.03,.13),0,0,0),0x8a7c55),tint(place(new THREE.BoxGeometry(.102,.032,.02),0,0,.05),0x6f6444)]);
}
// The mess tin by its folding handle.
function tinGeometry(){
 return mergeGeometries([tint(place(new THREE.CylinderGeometry(.08,.07,.1,8),0,0,0),0x8a9094),tint(place(new THREE.CylinderGeometry(.075,.075,.008,8),0,.05,0),0x56707a),tint(place(new THREE.BoxGeometry(.2,.012,.02),.14,.03,0),0x6d7276)]);
}
// A snare: wire noose on its peg.
function snareGeometry(){
 return mergeGeometries([tint(place(new THREE.CylinderGeometry(.01,.014,.2,5),0,0,0),0x7b5a3a),tint(place(new THREE.TorusGeometry(.05,.004,3,8),.03,.08,0,0,Math.PI/2,0),0xb7b4a6)]);
}
// A rabbit carried by its hind legs, head down.
function heldRabbitGeometry(){const g=rabbitGeometry();g.translate(0,-.18,0);g.rotateX(Math.PI/2);g.scale(.75,.75,.75);return g;}
// A branch, scaled to sit in the hand for carrying and lashing.
function heldBranchGeometry(){const g=branchGeometry(4);g.translate(0,-.12,0);g.scale(.6,.6,.6);return g;}

export function propGeometries(){
 return {branch:heldBranchGeometry(),stick:stickGeometry(8),hatchet:hatchetGeometry(),rabbit:heldRabbitGeometry(),tinder:tinderGeometry(),wood:woodGeometry(),steel:steelGeometry(),bottle:bottleGeometry(),ration:rationGeometry(),tin:tinGeometry(),snare:snareGeometry()};
}

// One-shot hand movements, each a prop and three key poses relative to the camera (position
// x,y,z then rotation x,y,z). The prop eases from key to key over the gesture's duration.
const LOW=[.2,-.5,-.5,.3,0,0],HELD=[.15,-.19,-.55,.15,.3,0],AWAY=[.05,-.42,-.98,.9,.2,0],BAG=[.36,-.55,-.35,.6,.6,.2];
export const GESTURES={
 // Picking something up: from the ground into view, then down into the bergen.
 'pickup-branch':{prop:'branch',time:.8,keys:[LOW,HELD,BAG]},
 'pickup-stick':{prop:'stick',time:.7,keys:[LOW,HELD,BAG]},
 'pickup-rabbit':{prop:'rabbit',time:.85,keys:[[.2,-.55,-.55,0,0,0],[.13,-.1,-.62,0,.4,0],BAG]},
 tinder:{prop:'tinder',time:.75,keys:[[.12,-.5,-.55,.6,0,0],[.14,-.2,-.5,.1,0,.1],BAG]},
 wood:{prop:'wood',time:.8,keys:[LOW,[.15,-.2,-.62,0,.5,0],BAG]},
 // Putting something down in front of you: the fire lay, wood on the fire, a snare, the spit, the tin.
 build:{prop:'wood',time:.85,keys:[HELD,[.1,-.26,-.75,.3,.4,0],AWAY]},
 stoke:{prop:'wood',time:.6,keys:[HELD,[.13,-.15,-.7,.2,.4,0],[.04,-.38,-1.1,.7,.4,0]]},
 snare:{prop:'snare',time:.8,keys:[HELD,[.1,-.28,-.7,.4,0,0],AWAY]},
 spit:{prop:'rabbit',time:.8,keys:[[.16,-.2,-.5,0,.4,0],[.08,-.2,-.8,0,1.2,0],[.03,-.34,-1.05,0,1.57,0]]},
 boil:{prop:'tin',time:.8,keys:[HELD,[.1,-.28,-.75,.1,0,0],AWAY]},
 // Taking something back from the fire or a snare.
 take:{prop:'rabbit',time:.8,keys:[[.03,-.34,-1.05,0,1.57,0],[.12,-.13,-.6,0,.6,0],BAG]},
 'take-pot':{prop:'tin',time:.8,keys:[AWAY,[.14,-.18,-.58,.1,0,0],BAG]},
 lift:{prop:'snare',time:.8,keys:[AWAY,HELD,BAG]},
 // One scrape of the fire steel down towards the tinder.
 strike:{prop:'steel',time:.45,keys:[[.12,-.08,-.48,.2,0,.5],[.07,-.2,-.55,.7,0,.3],[.12,-.12,-.5,.35,0,.5]]},
 // Water: dip the bottle and lift it out; drink by tipping it up.
 fill:{prop:'bottle',time:1,keys:[HELD,[.1,-.44,-.62,1.1,0,0],[.18,-.2,-.5,.2,0,0]]},
 drink:{prop:'bottle',time:1,keys:[[.22,-.45,-.45,0,0,0],[.05,-.06,-.38,1.9,0,0],[.22,-.5,-.4,.3,0,0]]},
 // Eating: from the bergen up towards your mouth.
 'eat-ration':{prop:'ration',time:.9,keys:[BAG,[.06,-.1,-.42,1.2,0,0],[.2,-.5,-.4,.5,0,0]]},
 'eat-rabbit':{prop:'rabbit',time:.9,keys:[BAG,[.06,-.12,-.45,.4,1.57,0],[.2,-.55,-.4,0,.5,0]]}
};
const ease=t=>t*t*(3-2*t);
// Writes the prop's pose for a gesture at progress p (0..1) into target (an Object3D).
export function poseGesture(gesture,p,target){
 const keys=gesture.keys,span=keys.length-1,s=Math.min(span-1e-6,Math.max(0,p)*span),i=Math.floor(s),t=ease(s-i),a=keys[i],b=keys[i+1];
 target.position.set(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t);target.rotation.set(a[3]+(b[3]-a[3])*t,a[4]+(b[4]-a[4])*t,a[5]+(b[5]-a[5])*t);
}
