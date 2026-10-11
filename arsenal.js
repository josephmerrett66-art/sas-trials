import {nearbyObstacles} from './obstacle-grid.js';
import * as THREE from './vendor/three.module.js';
import {loadPackFile,monochrome} from './pack-world.js?v=survival-7';
import {WeaponSounds} from './weapon-sounds.js?v=hills-2?v=performance-13';
import {consolidateSolidMaterials} from './solid-materials.js';

export const loadouts=[
 {id:'glock',name:'GLOCK G48',file:'Arms_Glock_G48',capacity:12,reserve:96,damage:34,rate:.2,reload:3,automatic:false,aimY:-.221,kick:.018},
 {id:'m416',name:'M416',file:'Arms_M416_Assault_Rifle',capacity:30,reserve:180,damage:25,rate:.1,reload:4.63,automatic:true,aimY:-.203,kick:.012},
 {id:'awm',name:'AWM SNIPER',file:'Arms_AWM_Sniper',capacity:5,reserve:25,damage:100,rate:1.5,reload:3.53,automatic:false,aimY:-.19,kick:.045},
 {id:'knife',name:'COMBAT KNIFE',file:'Arms_Combat_Knife',capacity:0,reserve:0,damage:60,rate:.6,reload:0},
 {id:'grenade',name:'FRAG GRENADE',file:'Arms_Grenade',capacity:3,reserve:0,damage:100,rate:1.6,reload:0}
];
export class LoadoutState {
 constructor(spec){this.spec=spec;this.reset();}
 reset(){this.ammo=this.spec.capacity;this.reserve=this.spec.reserve;this.cooldown=0;this.reloadTime=0;this.recoil=0;}
 fire(){if(this.cooldown>0||this.reloadTime>0||(this.spec.id!=='knife'&&this.ammo<=0))return false;if(this.spec.id!=='knife')this.ammo--;this.cooldown=this.spec.rate;this.recoil=1;return true;}
 reload(){if(!this.spec.reload||this.reloadTime>0||this.ammo===this.spec.capacity||this.reserve<=0)return false;this.reloadTime=this.spec.reload;return true;}
 step(dt){this.cooldown=Math.max(0,this.cooldown-dt);this.recoil*=Math.exp(-12*dt);if(this.reloadTime>0){this.reloadTime=Math.max(0,this.reloadTime-dt);if(this.reloadTime===0){const amount=Math.min(this.spec.capacity-this.ammo,this.reserve);this.ammo+=amount;this.reserve-=amount;}}}
}
export class Arsenal {
 constructor(camera,scene,feel,world,{knifeOnly=false}={}){this.specs=knifeOnly?loadouts.filter(s=>s.id==='knife'):loadouts;this.camera=camera;this.scene=scene;this.feel=feel;this.world=world;this.root=new THREE.Group();camera.add(this.root);this.entries=[];this.index=0;this.aim=0;this.ray=new THREE.Raycaster();this.sounds=new WeaponSounds({knifeOnly});this.reloadSound=null;this.eventTime=0;this.throwDelay=-1;this.hitTimer=0;this.pendingSelect=null;this.swingIndex=0;this.grenadeReleased=false;this.kickPitch=0;this.kickYaw=0;this.shotIndex=0;} 
 async load(){
  const [models]=await Promise.all([Promise.all(this.specs.map(spec=>loadPackFile('Weapons',spec.file))),this.sounds.ready]);
  this.entries=models.map((model,i)=>{
    if(this.specs[i].id==='glock'){
      const setup=new THREE.AnimationMixer(model);setup.clipAction(model.animations.find(c=>c.name.includes('Idle'))).play();setup.update(.01);model.updateMatrixWorld(true);
      const gunMesh=model.getObjectByName('Glock_Mesh'),bone=model.getObjectByName('Gun'),bounds=new THREE.Box3().setFromObject(gunMesh,true);
      const silencer=new THREE.Group();silencer.position.set((bounds.min.x+bounds.max.x)/2,bounds.max.y-3.8,bounds.max.z+8);
      const body=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.1,16,10),new THREE.MeshStandardMaterial({color:0x222222,flatShading:true}));body.rotation.x=Math.PI/2;silencer.add(body);
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,.6,10),body.material);cap.rotation.x=Math.PI/2;cap.position.z=8;silencer.add(cap);
      bone.attach(silencer);setup.stopAllAction();
    }
    monochrome(model,true);consolidateSolidMaterials(model);model.traverse(mesh=>{if(!mesh.isMesh)return;mesh.renderOrder=10000;mesh.material.fog=false;mesh.material.transparent=true;mesh.material.depthWrite=true;mesh.onBeforeRender=renderer=>{if(!this.viewDepthCleared){renderer.clearDepth();this.viewDepthCleared=true;}};});model.rotation.y=Math.PI;model.scale.setScalar(.01);model.visible=false;const mixer=new THREE.AnimationMixer(model);const actions={};
      if(this.specs[i].id==='grenade'){
        const tracks=model.animations[0].tracks.map(track=>{const pose=track.clone();pose.times=new Float32Array([0]);pose.values=new Float32Array(track.createInterpolant().evaluate(.12));return pose;});
        model.animations.push(new THREE.AnimationClip('Grenade_Ready',1,tracks));
      }
for(const clip of model.animations){const name=clip.name.split('|').pop();actions[name]=mixer.clipAction(clip);}return {model,mixer,actions,spec:this.specs[i],state:new LoadoutState(this.specs[i]),current:null,grenadeMesh:model.getObjectByName('Grenade_Mesh')};});
  this.select(0,true);
 }
 get current(){return this.entries[this.index];}get state(){return this.current.state;}
 reset(){this.sounds.stop();for(const entry of this.entries)entry.state.reset();this.select(0,true);}
 find(fragment){return Object.entries(this.current.actions).find(([name])=>name.includes(fragment))?.[1];}
 play(fragment,once=false,restart=false){const action=this.find(fragment);if(!action)return false;const entry=this.current;if(entry.current===action&&!restart)return true;const previous=entry.current;action.reset();action.enabled=true;action.setEffectiveWeight(1);action.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);action.clampWhenFinished=once;action.play();if(previous&&previous!==action){previous.fadeOut(.1);action.fadeIn(.1);}entry.current=action;return true;}
 select(index,immediate=false){if(!this.entries.length)return;if(this.throwDelay>=0)return;if(!immediate&&this.current.model.visible){if(this.current.spec.id==='knife')this.sounds.play('knifeHolster',.4);this.pendingSelect=(index+this.entries.length)%this.entries.length;this.eventTime=this.find('Holster')?.getClip().duration??.15;this.play('Holster',true,true);return;}if(this.reloadSound){this.reloadSound.stop();this.reloadSound=null;}this.pendingSelect=null;this.kickPitch=this.kickYaw=0;this.entries.forEach(entry=>{entry.model.visible=false;entry.mixer.stopAllAction();entry.current=null;entry.state.reloadTime=0;});this.index=(index+this.entries.length)%this.entries.length;this.root.clear();this.root.add(this.current.model);this.current.model.visible=true;if(this.current.spec.id==='knife')this.sounds.play('knifeDraw',.45);this.aim=0;this.eventTime=this.find('Draw')?.getClip().duration??.15;this.throwDelay=-1;this.grenadeReleased=false;this.play('Draw',true)||this.play('Ready')||this.play('Idle');}
 cycle(direction=1){this.select((this.pendingSelect??this.index)+direction);}
 reload(){if(this.pendingSelect!==null||!this.state.reload())return false;this.reloadSound=this.sounds.play('ammo',.4);this.eventTime=this.current.spec.reload;this.play(this.state.ammo===0&&this.find('Reload_Empty')?'Reload_Empty':'Reload',true);return true;}
 fire(){
  if(this.pendingSelect!==null||this.eventTime>0||!this.state.fire())return false;
  const spec=this.current.spec;
  if(spec.id!=='knife')this.onShot?.(spec.id,this.camera.position);
  if(spec.kick){const steadiness=1-this.aim*.4;this.kickPitch=Math.min(.09,this.kickPitch+spec.kick*steadiness);this.shotIndex++;this.kickYaw=THREE.MathUtils.clamp(this.kickYaw+Math.sin(this.shotIndex*2.4)*spec.kick*.22,-.018,.018);}
  if(spec.id==='grenade'){this.play('Throw',true,true);this.grenadeReleased=false;this.eventTime=1.57;this.throwDelay=.98;return true;}
  if(spec.id==='knife'){this.swingIndex=(this.swingIndex+1)%3;const attack=this.find(`Attack_${this.swingIndex+1}`);this.play(`Attack_${this.swingIndex+1}`,true,true);this.eventTime=attack?.getClip().duration??.5;}else{this.play(this.aim>.5?'ADS_Fire':'Fire',true,true);this.eventTime=spec.rate;this.sounds.play(spec.id,spec.id==='glock'?.65:spec.id==='m416'?.5:.75);}
  this.scene.updateMatrixWorld(true);this.ray.setFromCamera(new THREE.Vector2(),this.camera);this.ray.far=spec.id==='knife'?2.5:200;
  const targets=[...this.scene.children.filter(o=>o.isMesh&&!o.userData.decorative&&(this.current.spec.id!=='knife'||!o.isInstancedMesh&&o.name!=='Faceted forest floor'&&o.name!=='Winding dirt trail')),...(this.pursuer?.health>0?this.pursuer.parts:[]),...this.world.targets.filter(t=>t.health>0).map(t=>t.root)];
  let hit=this.ray.intersectObjects(targets,true)[0];if(this.current.spec.id==='knife'&&hit&&this.knifeBlocked(hit.distance))hit=null;if(hit?.object.userData.pursuer){hit.object.userData.pursuer.hit(spec.damage);this.hitTimer=.15;}else if(hit?.object.userData.combatTarget){hit.object.userData.combatTarget.damage(spec.damage);this.hitTimer=.15;}
  if(hit?.object.userData.combatTarget)this.sounds.play('impact',.25);this.world.shotEffects(this.camera,spec.id,hit);
  // Resolve this shot at the current crosshair, then kick the actual aim for the next shot.
  // Mouse/stick input can counter this persistent climb; weapon spring recovery is visual only.
  if(spec.kick&&this.player){const oldPitch=this.player.pitch,kick=spec.kick*(1-this.aim*.4),side=Math.sin(this.shotIndex*2.4)*kick*.22;this.player.pitch=THREE.MathUtils.clamp(oldPitch+kick,-Math.PI/2+.01,Math.PI/2-.01);this.player.yaw+=side;this.camera.rotation.x+=this.player.pitch-oldPitch;this.camera.rotation.y+=side;this.camera.updateMatrixWorld(true);}
  return true;
 }
 knifeBlocked(distance){
  const origin=this.ray.ray.origin,direction=this.ray.ray.direction;
  for(const o of nearbyObstacles(this.world.obstacles,origin.x,origin.z,distance,this.nearby??(this.nearby=[]))){if(Math.abs(o.x-origin.x)>distance+o.radius||Math.abs(o.z-origin.z)>distance+o.radius)continue;
   const along=(o.x-origin.x)*direction.x+(o.z-origin.z)*direction.z;if(along<=0||along>=distance)continue;
   const y=origin.y+direction.y*along;if(y<(o.baseY??0)||y>(o.baseY??0)+o.height)continue;
   const dx=origin.x+direction.x*along-o.x,dz=origin.z+direction.z*along-o.z;if(dx*dx+dz*dz<o.radius*o.radius)return true;
  }return false;
 }
 melee(){if(this.eventTime>0||this.state.reloadTime>0)return;this.play('Melee',true,true)||this.play('Attack_1',true,true);this.eventTime=.55;this.state.recoil=.7;this.scene.updateMatrixWorld(true);this.ray.setFromCamera(new THREE.Vector2(),this.camera);this.ray.far=2.5;const targets=[...this.scene.children.filter(o=>o.isMesh&&!o.userData.decorative&&(this.current.spec.id!=='knife'||!o.isInstancedMesh&&o.name!=='Faceted forest floor'&&o.name!=='Winding dirt trail')),...(this.pursuer?.health>0?this.pursuer.parts:[]),...this.world.targets.filter(t=>t.health>0).map(t=>t.root)];let hit=this.ray.intersectObjects(targets,true)[0];if(this.current.spec.id==='knife'&&hit&&this.knifeBlocked(hit.distance))hit=null;if(hit?.object.userData.pursuer){hit.object.userData.pursuer.hit(60);this.hitTimer=.15;}else if(hit?.object.userData.combatTarget){hit.object.userData.combatTarget.damage(60);this.hitTimer=.15;}}
 update(dt,player,feel,active,aiming=false,lookMotion=null){
  this.player=player;this.viewDepthCleared=false;this.root.visible=active;if(!this.current)return;
  for(const entry of this.entries)entry.state.step(dt);
  this.eventTime=Math.max(0,this.eventTime-dt);if(this.eventTime===0&&this.pendingSelect!==null)this.select(this.pendingSelect,true);this.hitTimer=Math.max(0,this.hitTimer-dt);
  if(this.throwDelay>=0){this.throwDelay-=dt;if(this.throwDelay<=0){this.root.updateMatrixWorld(true);const hand=this.current.model.getObjectByName('Gun');const releasePosition=hand?.getWorldPosition(new THREE.Vector3());this.world.throwGrenade(this.camera,releasePosition);this.grenadeReleased=true;this.throwDelay=-1;}}
  const spec=this.current.spec,canAim=spec.id!=='knife'&&spec.id!=='grenade',target=active&&aiming&&canAim&&this.state.reloadTime===0?1:0;
  this.aim+=(target-this.aim)*(1-Math.exp(-18*dt));if(!active)this.aim=0;
  if(this.eventTime===0){if(spec.id==='grenade'){this.play('Ready');this.grenadeReleased=false;}else if(this.aim>.5&&this.find('ADS_Anim')){this.play('ADS_Anim',true);}else if(spec.id==='glock'&&this.state.ammo===0&&this.find('Empty_Mag')){this.play('Empty_Mag',true);}else if(!player.grounded){this.play('Jump');}else if(player.state==='SPRINTING'){this.play('Run');}else if(Math.hypot(player.vx,player.vz)>.3){this.play('Walk');}else this.play('Idle');}
  this.current.mixer.update(dt);
  // Pack rigs face +Z, so rotate them to camera forward. The ADS clip handles hand placement.
  this.root.position.set(.12*(1-this.aim),THREE.MathUtils.lerp(-.22,spec.aimY??-.2,this.aim),-.13);this.root.rotation.set(0,0,0);
  const sway=(1-this.aim)*player.config.armMotion;this.root.position.y+=Math.sin(feel.phase*2)*.006*sway;
  this.root.position.z+=this.state.recoil*(spec.kick?spec.kick*1.5:.018);
  this.root.rotation.x=this.kickPitch*.7+(lookMotion?.weaponPitch??0)*player.config.armMotion;this.root.rotation.y=(lookMotion?.weaponYaw??0)*player.config.armMotion;this.root.rotation.z=-this.kickYaw*.5;
  const recovery=Math.exp(-10*dt);this.kickPitch*=recovery;this.kickYaw*=recovery;
  this.current.model.visible=!(spec.id==='awm'&&this.aim>.9);
  if(this.current.grenadeMesh)this.current.grenadeMesh.visible=(this.state.ammo>0||this.eventTime>0)&&!this.grenadeReleased;
 }
 hud(){const spec=this.current.spec,state=this.state;return `${this.index+1} · ${spec.name}   ${spec.id==='knife'?'MELEE':`${state.ammo} / ${state.reserve}`}${state.reloadTime>0?' · RELOADING':''}`;}
}
