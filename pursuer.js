import * as THREE from './vendor/three.module.js';
import {collideForest} from './forest.js?v=gullies-1-r1';

export class Pursuer {
  constructor(scene,obstacles,feel){
    this.obstacles=obstacles;this.feel=feel;this.root=new THREE.Group();scene.add(this.root);this.parts=[];
    const dark=new THREE.MeshStandardMaterial({color:0x191919,flatShading:true,roughness:1}),skin=new THREE.MeshStandardMaterial({color:0xa5a5a5,flatShading:true,roughness:1});
    const box=(size,pos,material=dark,parent=this.root)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...pos);parent.add(mesh);mesh.userData.pursuer=this;this.parts.push(mesh);return mesh;};
    box([.49,.63,.26],[0,1.23,0]);box([.38,.22,.25],[0,.83,0]);
    box([.26,.33,.25],[0,1.74,0],skin);box([.29,.14,.28],[0,1.92,.015]);
    box([.23,.07,.012],[0,1.77,-.132]);
    this.arms=[];this.legs=[];
    for(const side of [-1,1]){
      const arm=new THREE.Group();arm.position.set(side*.32,1.5,0);this.root.add(arm);box([.14,.43,.15],[0,-.2,0],dark,arm);const forearm=box([.13,.33,.14],[0,-.5,-.13],dark,arm);forearm.rotation.x=-.65;box([.13,.14,.14],[0,-.64,-.24],skin,arm);this.arms.push(arm);
      const leg=new THREE.Group();leg.position.set(side*.115,.82,0);this.root.add(leg);box([.17,.67,.19],[0,-.34,0],dark,leg);box([.19,.13,.32],[0,-.73,-.06],dark,leg);this.legs.push(leg);
    }
    this.reset();
  }
  reset(){this.x=-8;this.z=-23;this.y=0;this.vx=0;this.vz=0;this.health=100;this.playerHealth=100;this.stagger=0;this.attack=0;this.dead=0;this.phase=0;this.steps=0;this.routeSide=1;this.blocked=0;this.status='SOMETHING IS FOLLOWING YOU';collideForest(this,this.obstacles);this.root.position.set(this.x,0,this.z);this.root.rotation.set(0,0,0);this.root.visible=true;}
  hit(damage=34){if(this.health<=0)return false;this.health=Math.max(0,this.health-damage);this.stagger=.3;if(this.health===0){this.dead=5;this.status='DOWN — KEEP MOVING';}return true;}
  step(dt,player){
    if(this.playerHealth<=0){this.status='CAUGHT — RESPAWN TO TRY AGAIN';return;}
    this.attack=Math.max(0,this.attack-dt);this.stagger=Math.max(0,this.stagger-dt);
    if(this.health<=0){this.dead-=dt;this.root.rotation.z+=(Math.PI/2-this.root.rotation.z)*(1-Math.exp(-10*dt));this.root.position.y=-.15;if(this.dead<=0){const angle=player.yaw+Math.PI+(Math.random()-.5)*1.2;this.x=player.x-Math.sin(angle)*26;this.z=player.z-Math.cos(angle)*26;this.health=100;this.root.rotation.z=0;this.root.position.y=0;this.status='YOU HEAR RUNNING AGAIN';}return;}
    let dx=player.x-this.x,dz=player.z-this.z,distance=Math.hypot(dx,dz),nx=distance?dx/distance:0,nz=distance?dz/distance:1;
    // Steer around nearby trunks, with a side bias to break head-on collisions.
    let steerX=nx,steerZ=nz;
    for(const obstacle of this.obstacles){const ox=obstacle.x-this.x,oz=obstacle.z-this.z,along=ox*nx+oz*nz,lateral=ox*(-nz)+oz*nx,clearance=obstacle.radius+.7;if(along>0&&along<2.8&&Math.abs(lateral)<clearance){const side=Math.abs(lateral)>.08?(lateral>0?-1:1):this.routeSide;const force=(1-along/2.8)*2.5;steerX+=-nz*side*force;steerZ+=nx*side*force;}}
    const norm=Math.hypot(steerX,steerZ)||1,speed=this.stagger>0?(this.hitSpeed??1.4):distance>16?(this.farSpeed??7.9):(this.walkSpeed??6.8);
    this.vx=steerX/norm*speed;this.vz=steerZ/norm*speed;const oldX=this.x,oldZ=this.z;
    if(distance>(this.stopDistance??1)&&!(this.stopDuringAttack&&this.attack>0)){this.x+=this.vx*dt;this.z+=this.vz*dt;collideForest(this,this.obstacles);}
    const travelled=Math.hypot(this.x-oldX,this.z-oldZ);this.blocked=travelled<speed*dt*.2?this.blocked+dt:0;if(this.blocked>.5){this.routeSide*=-1;this.blocked=0;}
    this.phase+=travelled*4;this.steps+=travelled;
    if(this.steps>1.65){this.steps=0;if(distance<22)this.feel.sound(Math.max(.12,1-distance/24),false);}
    this.root.position.set(this.x,Math.abs(Math.sin(this.phase))* .045,this.z);this.root.rotation.y=Math.atan2(-nx,-nz);this.root.rotation.z=this.stagger>0?.08:0;
    this.arms.forEach((arm,i)=>arm.rotation.x=Math.sin(this.phase+i*Math.PI)*.8-.35);this.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(this.phase+i*Math.PI)*.7);
    distance=Math.hypot(player.x-this.x,player.z-this.z);
    if(distance<(this.attackRange??1.35)&&this.attack===0&&!(this.stopDuringHit&&this.stagger>0)){this.playerHealth=Math.max(0,this.playerHealth-25);this.attack=this.attackCooldown??.85;this.feel.landed(9);this.root.rotation.x=-.15;}else this.root.rotation.x*=Math.exp(-8*dt);
    this.status=this.playerHealth<=0?'CAUGHT — RESPAWN TO TRY AGAIN':distance<5?'RUN — RIGHT BEHIND YOU':distance<16?'THEY ARE CLOSING IN':'SOMETHING IS FOLLOWING YOU';
  }
}
