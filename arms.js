import * as THREE from './vendor/three.module.js';

// Camera-mounted viewmodel, animated independently from the player collider.
export class FirstPersonArms {
  constructor(camera){
    this.root=new THREE.Group();camera.add(this.root);
    const sleeve=new THREE.MeshStandardMaterial({color:0x252525,roughness:1,flatShading:true,depthTest:false,depthWrite:false});
    const cuff=new THREE.MeshStandardMaterial({color:0x555555,roughness:1,flatShading:true,depthTest:false,depthWrite:false});
    const skin=new THREE.MeshStandardMaterial({color:0xbcbcbc,roughness:1,flatShading:true,depthTest:false,depthWrite:false});
    this.arms=[-1,1].map(side=>{
      const pivot=new THREE.Group();this.root.add(pivot);
      // Elbow pivot, forearm extending toward the lower center of the view.
      const forearm=new THREE.Mesh(new THREE.CylinderGeometry(.075,.11,.42,5),sleeve);forearm.rotation.x=Math.PI/2;forearm.position.z=-.21;pivot.add(forearm);
      const wrist=new THREE.Mesh(new THREE.CylinderGeometry(.079,.079,.075,5),cuff);wrist.rotation.x=Math.PI/2;wrist.position.z=-.43;pivot.add(wrist);
      const hand=new THREE.Mesh(new THREE.BoxGeometry(.13,.12,.17),skin);hand.position.set(0,.015,-.53);hand.rotation.z=side*.12;pivot.add(hand);
      const thumb=new THREE.Mesh(new THREE.BoxGeometry(.045,.065,.095),skin);thumb.position.set(-side*.072,-.018,-.5);thumb.rotation.z=-side*.4;pivot.add(thumb);
      pivot.traverse(object=>{if(object.isMesh){object.renderOrder=10;object.frustumCulled=false;}});
      return {pivot,side};
    });
    this.clock=0;this.swing=0;this.sprint=0;
  }
  update(dt,player,feel,active){
    this.root.visible=active;
    const speed=Math.hypot(player.vx,player.vz),moving=player.grounded&&speed>.2&&player.slide<=0;
    const blend=1-Math.exp(-12*dt);
    this.clock+=dt;
    this.swing+=((moving?Math.min(1.2,speed/player.config.walk):0)-this.swing)*blend;
    this.sprint+=((player.state==='SPRINTING'?1:0)-this.sprint)*blend;
    const sliding=player.slide>0,airborne=!player.grounded;
    const intensity=player.config.armMotion??1;
    for(const {pivot,side} of this.arms){
      const phase=feel.phase+(side===1?Math.PI:0),wave=Math.sin(phase),lift=Math.cos(phase);
      pivot.position.set(side*(.29+this.sprint*.025),-.36+(wave*.075*this.swing+this.sprint*.035+(airborne?.035:0)-(sliding?.06:0)+feel.dip*.35)*intensity,-.16+lift*.065*this.swing*intensity);
      pivot.rotation.set((-.12+wave*.26*this.swing-this.sprint*.18+(airborne?-.2:0)+(sliding?.35:0))*intensity,side*(-.22+wave*.12*this.swing*intensity),side*(.12+lift*.13*this.swing*intensity));
    }
  }
}
