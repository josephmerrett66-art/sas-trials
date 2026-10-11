import * as THREE from './vendor/three.module.js';
import {buildPistol} from './pistol-model.js';

export class PistolState {
  constructor(){this.reset();}
  reset(){this.ammo=12;this.reserve=96;this.cooldown=0;this.reloadTime=0;this.recoil=0;}
  fire(){if(this.cooldown>0||this.reloadTime>0||this.ammo<=0)return false;this.ammo--;this.cooldown=.19;this.recoil=1;return true;}
  reload(){if(this.reloadTime>0||this.ammo===12||this.reserve<=0)return false;this.reloadTime=1.5;return true;}
  step(dt){this.cooldown=Math.max(0,this.cooldown-dt);this.recoil*=Math.exp(-15*dt);if(this.reloadTime>0){this.reloadTime=Math.max(0,this.reloadTime-dt);if(this.reloadTime===0){const rounds=Math.min(12-this.ammo,this.reserve);this.ammo+=rounds;this.reserve-=rounds;}}}
}
export class Pistol {
  constructor(camera,scene,feel){
    this.state=new PistolState();this.scene=scene;this.camera=camera;this.feel=feel;this.root=new THREE.Group();camera.add(this.root);this.ray=new THREE.Raycaster();
    Object.assign(this,buildPistol(this.root));
    this.shots=Array.from({length:6},()=>{const audio=new Audio('./assets/audio/silenced-pistol.wav');audio.preload='auto';audio.volume=.7;return audio;});this.shotIndex=0;this.aim=0;
    this.impacts=[];this.impactGeometry=new THREE.SphereGeometry(.025,4,3);this.impactMaterial=new THREE.MeshBasicMaterial({color:0x222222});
  }
  fire(){
    if(!this.state.fire())return false;
    const shot=this.shots[this.shotIndex];this.shotIndex=(this.shotIndex+1)%this.shots.length;shot.currentTime=0;shot.play().catch(()=>{});
    this.ray.setFromCamera(new THREE.Vector2(0,0),this.camera);
    const targets=[...this.scene.children.filter(o=>o.isMesh&&!this.impacts.includes(o)),...(this.pursuer?.health>0?this.pursuer.parts:[])];
    const hit=this.ray.intersectObjects(targets,false)[0];
    if(hit?.object.userData.pursuer){hit.object.userData.pursuer.hit();document.querySelector('#hitmarker')?.animate([{opacity:1},{opacity:0}],{duration:180});}
    else if(hit&&hit.distance<150){const mark=new THREE.Mesh(this.impactGeometry,this.impactMaterial);mark.position.copy(hit.point).addScaledVector(this.ray.ray.direction,-.03);this.scene.add(mark);this.impacts.push(mark);if(this.impacts.length>100)this.scene.remove(this.impacts.shift());}
    return true;
  }
  update(dt,player,feel,active,aiming=false){
    this.root.visible=active;this.state.step(dt);
    if(!active)this.aim=0;
    const target=active&&aiming&&this.state.reloadTime===0?1:0;
    this.aim+=(target-this.aim)*(1-Math.exp(-18*dt));
    const s=this.state,t=s.reloadTime>0?1-s.reloadTime/1.5:0,reload=Math.sin(t*Math.PI),speed=Math.hypot(player.vx,player.vz),bob=player.grounded?Math.min(1,speed/6):0,sprint=player.state==='SPRINTING';
    const intensity=player.config.armMotion;
    const aim=this.aim,hip=1-aim,sway=hip*hip;
    // Both sight tops sit at local y=.098; move that line onto camera center.
    this.root.position.set(.22*hip+Math.cos(feel.phase)*.012*bob*intensity*sway,THREE.MathUtils.lerp(-.18,-.098,aim)+Math.sin(feel.phase*2)*.012*bob*intensity*sway-reload*.05,THREE.MathUtils.lerp(-.5,-.42,aim)+s.recoil*.065);
    this.root.rotation.set(s.recoil*THREE.MathUtils.lerp(.13,.075,aim)-reload*.35+(sprint?-.2*hip:0),.3*hip+reload*-.35,.025*hip+(sprint?-.2*hip:reload*.45));
    this.slide.position.z=-.105+s.recoil*.045;this.magazine.position.y=-.188-Math.sin(t*Math.PI)*.22;
    this.left.position.set(-.052-reload*.12,-.018-reload*.24,-.033+reload*.12);this.left.rotation.z=-.14-reload*.45;
  }
}
