import * as THREE from './vendor/three.module.js';
import {FBXLoader} from './vendor/FBXLoader.js';
import {consolidateSolidMaterials} from './solid-materials.js';

// Reuse the original gun arms and clips; load one rig and keep only its arms mesh.
export class NavigationArms {
 constructor(root){
  this.root=root;this.lower=0;this.left=new THREE.Vector3();this.right=new THREE.Vector3();
  this.inverse=new THREE.Matrix4();this.ready=this.load();
 }
 async load(){
  const model=await new FBXLoader().loadAsync('./assets/pack/Weapons/Arms_Glock_G48.fbx');
  const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});for(const mesh of meshes)if(mesh.name!=='Arms_Mesh'){mesh.removeFromParent();mesh.geometry.dispose();}
  const arms=model.getObjectByName('Arms_Mesh');
  for(const material of arms.material){if(material.name!=='Gloves')material.color.setHex(0xb89b70);}
  consolidateSolidMaterials(model);arms.frustumCulled=false;arms.renderOrder=100;arms.material.depthTest=false;arms.material.depthWrite=false;arms.material.fog=false;
  model.rotation.y=Math.PI;model.scale.setScalar(.01);model.position.set(0,-.52,-.15);this.root.add(model);this.model=model;this.mesh=arms;
  this.leftShoulder=model.getObjectByName('Shoulder_L');this.rightShoulder=model.getObjectByName('Shoulder_R');
  this.leftHand=model.getObjectByName('Hand_L');this.rightHand=model.getObjectByName('Hand_R');
  this.mixer=new THREE.AnimationMixer(model);this.actions={};
  // Shoulder translation is owned by the holding pose, not overwritten by clip blending.
  for(const name of ['Idle','Walk','Run']){
   const clip=model.animations.find(c=>c.name.includes(`_${name}_`)).clone();
   clip.tracks=clip.tracks.filter(t=>!/^Shoulder_[LR]\.position$/.test(t.name));
   this.actions[name]=this.mixer.clipAction(clip);
  }
  this.leftBase=this.leftShoulder.position.clone();this.rightBase=this.rightShoulder.position.clone();
  this.current=this.actions.Idle;this.current.play();this.mixer.update(.01);this.root.updateWorldMatrix(true,true);this.readHands();
 }
 readHands(){
  this.inverse.copy(this.root.matrixWorld).invert();
  this.left.setFromMatrixPosition(this.leftHand.matrixWorld).applyMatrix4(this.inverse);
  this.right.setFromMatrixPosition(this.rightHand.matrixWorld).applyMatrix4(this.inverse);
 }
 update(dt,player,feel){
  if(!this.model)return;
  const speed=Math.hypot(player.vx??0,player.vz??0),moving=player.grounded&&speed>.2&&!(player.slide>0);
  const action=this.actions[moving?(player.state==='SPRINTING'?'Run':'Walk'):'Idle'];
  if(action!==this.current){action.reset().play();this.current.crossFadeTo(action,.16,false);this.current=action;}
  this.current.setEffectiveTimeScale(moving?Math.min(1.35,speed/(player.state==='SPRINTING'?player.config.sprint:player.config.walk)):1);
  this.mixer.update(dt);
  const blend=1-Math.exp(-12*dt);this.lower+=((moving?(player.state==='SPRINTING'?.16:.08):0)-this.lower)*blend;
  this.leftShoulder.position.copy(this.leftBase);this.rightShoulder.position.copy(this.rightBase);
  // FBX local X points left, Z points up, and Y points toward the camera.
  this.leftShoulder.position.x+=.406;this.leftShoulder.position.z-=.254;this.leftShoulder.position.y-=.218;
  this.rightShoulder.position.x-=.272;this.rightShoulder.position.z-=.346;this.rightShoulder.position.y-=.236;
  this.model.position.y=-.52-this.lower+(feel?.dip??0)*.25;this.model.position.z=-.15;
  // Update only the arm hierarchy for hand positions; the scene updates equipment later.
  this.model.updateWorldMatrix(true,true);this.readHands();
 }
}
