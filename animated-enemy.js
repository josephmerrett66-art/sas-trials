import * as THREE from './vendor/three.module.js';
import {terrainNormal} from './terrain.js?v=river-1';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {collideForest} from './forest.js?v=gullies-1-r1';
import {Pursuer} from './pursuer.js?v=grounding-2-r1';

let templatePromise;
function cloneRig(source){
 const clone=source.clone(true),copies=new Map();
 const pair=(a,b)=>{copies.set(a,b);for(let i=0;i<a.children.length;i++)pair(a.children[i],b.children[i]);};pair(source,clone);
 clone.traverse(mesh=>{if(mesh.isSkinnedMesh){const original=[...copies].find(([a,b])=>b===mesh)[0];mesh.skeleton=new THREE.Skeleton(original.skeleton.bones.map(b=>copies.get(b)),original.skeleton.boneInverses);mesh.bindMatrix.copy(original.bindMatrix);mesh.bindMatrixInverse.copy(original.bindMatrixInverse);}});return clone;
}
export class AnimatedEnemy extends Pursuer {
 constructor(scene,obstacles,feel){
  super(scene,obstacles,feel);this.scene=scene;this.shadowNormal=new THREE.Vector3();this.shadowUp=new THREE.Vector3(0,1,0);this.shadowRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);this.shadowFoot=new THREE.Vector3();this.animationTime=0;this.stopDuringAttack=true;this.attackCooldown=1.8;this.walkSpeed=1.8;this.farSpeed=1.8;this.hitSpeed=0;this.stopDuringHit=true;this.ready=this.load();
 }
 async load(){
  templatePromise??=new GLTFLoader().loadAsync('./assets/enemy/pursuer.glb');const template=await templatePromise;const asset={scene:cloneRig(template.scene),animations:template.animations};
  const oldMaterials=new Set();this.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();oldMaterials.add(o.material);}});for(const m of oldMaterials)m.dispose();this.root.clear();this.arms=[];this.legs=[];
  this.model=asset.scene;this.root.add(this.model);this.mixer=new THREE.AnimationMixer(this.model);this.actions={};
  for(const clip of asset.animations)this.actions[clip.name]=this.mixer.clipAction(clip);
  this.actions.A_TPose.play();this.mixer.update(.01);this.model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(this.model),height=bounds.max.y-bounds.min.y;
  this.model.scale.setScalar(1.85/height);this.model.position.y=-bounds.min.y*this.model.scale.x;this.model.rotation.y=Math.PI;
  this.model.traverse(mesh=>{if(!mesh.isMesh)return;const old=mesh.material;mesh.material=new THREE.MeshLambertMaterial({color:/Joints/.test(old.name)?0x252c28:0x717a65,flatShading:true});mesh.castShadow=false;mesh.receiveShadow=true;});
  this.feet=['foot_l','foot_r'].map(name=>this.model.getObjectByName(name));
  this.footPositions=[new THREE.Vector3(),new THREE.Vector3()];this.model.updateMatrixWorld(true);
  this.soleOffset=Math.min(...this.feet.map(foot=>foot.getWorldPosition(new THREE.Vector3()).y));this.baseY=this.model.position.y;this.size=1;this.heading=0;
  this.flinchBones=['spine_02','spine_03','neck_01','upperarm_l','upperarm_r'].map(name=>this.model.getObjectByName(name));
  this.mixer.stopAllAction();
  // A single hidden capsule handles damage instead of raycasting the animated skin.
  this.proxy=new THREE.Mesh(new THREE.CapsuleGeometry(.32,1.18,4,8),new THREE.MeshBasicMaterial());this.proxy.position.y=.91;this.proxy.visible=false;this.proxy.userData.pursuer=this;this.root.add(this.proxy);this.parts=[this.proxy];
  // Soft sun-aligned body shadow and two tighter sole contacts in one draw.
  const shadowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,uniforms:{left:{value:new THREE.Vector2()},right:{value:new THREE.Vector2()},contacts:{value:new THREE.Vector2(1,1)}},vertexShader:`varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 p;uniform vec2 left;uniform vec2 right;uniform vec2 contacts;void main(){vec2 q=p-vec2(.24,.16);float body=exp(-dot(q*vec2(2.0,2.8),q*vec2(2.0,2.8)))*.19;float a=exp(-dot((p-left)*vec2(9.,7.),(p-left)*vec2(9.,7.)))*.24;float b=exp(-dot((p-right)*vec2(9.,7.),(p-right)*vec2(9.,7.)))*.24;float edge=1.-smoothstep(.65,.98,max(abs(p.x),abs(p.y)));gl_FragColor=vec4(.075,.095,.06,(body+a*contacts.x+b*contacts.y)*edge);}`});
  this.shadow=new THREE.Mesh(new THREE.PlaneGeometry(2,2),shadowMaterial);this.shadow.rotation.x=-Math.PI/2;this.shadow.userData.decorative=true;this.scene.add(this.shadow);
  this.reset();this.updateShadow();
 }
 play(name,once=false,restart=false){
  const action=this.actions?.[name];if(!action||this.current===action&&!restart)return;
  const previous=this.current;action.stopFading();action.reset().setEffectiveWeight(1).setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);action.clampWhenFinished=once;action.setEffectiveTimeScale(name==='Zombie_Walk_Fwd_Loop'?2.3:1);action.play();if(previous&&previous!==action){previous.fadeOut(.12);action.fadeIn(.12);}this.current=action;
 }
 reset(){super.reset();this.x=3;this.z=24;this.root.position.set(this.x,0,this.z);this.root.rotation.set(0,0,0);this.grace=2;this.animationTime=0;this.heading=0;this.flinchTime=0;this.current=null;if(this.mixer){this.mixer.stopAllAction();this.play('Zombie_Idle_Loop');this.mixer.update(.01);}}
 hit(damage){
  const reacting=this.stagger>0,remaining=this.stagger;
  const accepted=super.hit(damage);if(!accepted)return false;
  this.attack=0;
  if(this.health===0){
   this.stagger=0;this.flinchTime=0;this.play('Hit_Knockback',true,true);
  }else{
   this.stagger=reacting?remaining:.55;
   if(!reacting){this.flinchTime=0;this.play('Zombie_Idle_Loop');}
  }
  if(this.proxy)this.proxy.visible=false;
  return true;
 }
 applyFlinch(dt){
  if(this.health<=0||this.stagger<=0)return;
  this.flinchTime+=dt;
  const t=this.flinchTime,strength=t<.1?t/.1:Math.max(0,1-(t-.1)/.45);
  for(let i=0;i<this.flinchBones.length;i++)this.flinchBones[i].rotation.x+=strength*(i<2?-.16:i===2?.12:.18);
  if(t<.2){const distance=.32*this.size*dt/.2;this.x+=Math.sin(this.heading)*distance;this.z+=Math.cos(this.heading)*distance;collideForest(this,this.obstacles);this.root.position.set(this.x,0,this.z);}
 }
 get radius(){return .32*(this.size||1);}
 setSize(size){this.size=size;this.attackRange=1.35*size;this.stopDistance=1.05*size;this.root.scale.setScalar(size);this.shadow?.scale.setScalar(size);}
 groundPose(){
  this.y=this.groundHeight?.(this.x,this.z)??0;this.root.position.y=this.y;
  if(!this.feet)return;
  this.model.position.y=this.baseY;this.root.updateMatrixWorld(true);
  for(let i=0;i<2;i++)this.feet[i].getWorldPosition(this.footPositions[i]);
  const lowest=Math.min(this.footPositions[0].y-(this.groundHeight?.(this.footPositions[0].x,this.footPositions[0].z)??0),this.footPositions[1].y-(this.groundHeight?.(this.footPositions[1].x,this.footPositions[1].z)??0));
  // Ground the supporting sole without adding a second procedural body bounce.
  if(this.health>0)this.model.position.y+=(this.soleOffset*this.size-lowest)/this.size;
  this.root.updateMatrixWorld(true);
  for(let i=0;i<2;i++)this.feet[i].getWorldPosition(this.footPositions[i]);
 }
 updateShadow(){if(this.shadow){this.shadow.position.set(this.x,(this.groundHeight?.(this.x,this.z)??0)+.029,this.z);if(this.groundHeight){terrainNormal(this.x,this.z,this.shadowNormal);this.shadow.quaternion.setFromUnitVectors(this.shadowUp,this.shadowNormal).multiply(this.shadowRotation);}this.shadow.updateMatrixWorld(true);this.shadow.visible=this.root.visible&&this.health>0;
  for(let i=0;i<2;i++){const foot=this.footPositions[i];this.shadow.material.uniforms.contacts.value.setComponent(i,Math.exp(-Math.max(0,foot.y-(this.groundHeight?.(foot.x,foot.z)??0)-this.soleOffset*this.size)*12/this.size));this.shadowFoot.copy(foot);this.shadow.worldToLocal(this.shadowFoot);this.shadow.material.uniforms[i?'right':'left'].value.set(this.shadowFoot.x,this.shadowFoot.y);}
 }}
 step(dt,player){
  const size=player.config?.size??1;if(size!==this.size)this.setSize(size);
  if(!this.mixer||dt<=0){this.groundPose();this.updateShadow();return;}
  if(this.health<=0){
   // Knockback is a fall clip: reserve it for death and keep its final pose.
   this.mixer.update(dt);this.groundPose();this.updateShadow();return;
  }
  this.grace=Math.max(0,this.grace-dt);
  const oldX=this.x,oldZ=this.z,previousAttack=this.attack;
  if(this.grace===0)super.step(dt,player);
  if(this.health>0){
   const target=this.root.rotation.y;this.heading+=(Math.atan2(Math.sin(target-this.heading),Math.cos(target-this.heading)))*(1-Math.exp(-12*dt));
   this.root.rotation.set(0,this.heading,0);this.root.position.set(this.x,0,this.z);
  }
  if(this.attack>previousAttack&&this.health>0)this.play('Zombie_Scratch',true,true);
  if(this.health>0&&this.stagger===0){if(this.playerHealth<=0||this.grace>0)this.play('Zombie_Idle_Loop');else if(this.attack>0)this.play('Zombie_Scratch',true);else if(Math.hypot(this.x-oldX,this.z-oldZ)>.001)this.play('Zombie_Walk_Fwd_Loop');else this.play('Zombie_Idle_Loop');}
  if(this.current===this.actions.Zombie_Walk_Fwd_Loop)this.current.setEffectiveTimeScale(Math.min(3.2,Math.hypot(this.x-oldX,this.z-oldZ)/dt/(1.9*this.size)));
  this.mixer.update(dt);this.applyFlinch(dt);this.groundPose();this.updateShadow();
 }
}
