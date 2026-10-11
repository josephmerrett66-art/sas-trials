export const defaults = {walk:6,sprint:9.5,acceleration:45,braking:42,directionGrip:12,airControl:8,jump:1.2,sensitivity:0.002,fov:85,stickSensitivity:2.5,stickCurve:1.6,adsSensitivity:.55,deadzone:.08,juice:1,armMotion:1,size:1.35,footstepVolume:.35};
export class Controller {
  constructor(groundHeight=null,boundary=Infinity){this.groundHeight=groundHeight;this.boundary=boundary;this.config={...defaults};this.reset();}
  reset(){this.x=0;this.z=8;this.y=0;this.vx=0;this.vz=0;this.vy=0;this.yaw=0;this.pitch=0;this.grounded=true;this.slide=0;this.eye=1.7*this.config.size;this.travel=0;this.jumpBuffer=0;this.time=0;this.lastGround=0;this.wasCrouch=false;this.state='GROUNDED';}
  get radius(){return .3*this.config.size;}
  setSize(size){const next=Math.min(2.2,Math.max(.7,size));this.eye*=next/this.config.size;this.config.size=next;}
  step(dt,keys,autoJump=false,analog=null){
    this.time+=dt;
    const crouch=keys.has('KeyC'), sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');
    if(this.grounded)this.lastGround=this.time;
    const speed=Math.hypot(this.vx,this.vz);
    if(crouch&&!this.wasCrouch&&this.grounded&&speed>7){this.slide=.75;this.vx*=1.15;this.vz*=1.15;}
    this.wasCrouch=crouch;this.slide=Math.max(0,this.slide-dt);
    let side=Number(keys.has('KeyD'))-Number(keys.has('KeyA')), forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
    if(analog){side+=analog.x;forward-=analog.y;}
    const length=Math.min(1,Math.hypot(side,forward)), rawLength=Math.hypot(side,forward);if(rawLength){side/=rawLength;forward/=rawLength;}
    const wx=side*Math.cos(this.yaw)-forward*Math.sin(this.yaw),wz=-side*Math.sin(this.yaw)-forward*Math.cos(this.yaw);
    const max=crouch?3:(sprint&&forward>0?this.config.sprint:this.config.walk);
    if(this.slide>0&&this.grounded){const decay=Math.exp(-1.4*dt);this.vx*=decay;this.vz*=decay;}
    else if(this.grounded){
      const tx=wx*max*length,tz=wz*max*length;
      let rate=this.config.braking;
      if(length){
        const along=this.vx*wx+this.vz*wz,grip=1-Math.exp(-this.config.directionGrip*dt);
        // Shed sideways drift progressively; keep forward momentum and never flip instantly.
        this.vx-=(this.vx-wx*along)*grip;this.vz-=(this.vz-wz*along)*grip;
        rate=along<0?this.config.braking+this.config.acceleration*.35:along>max*length?this.config.braking:this.config.acceleration;
      }
      const dx=tx-this.vx,dz=tz-this.vz,d=Math.hypot(dx,dz),step=rate*dt;
      if(d>0){const fraction=Math.min(1,step/d);this.vx+=dx*fraction;this.vz+=dz*fraction;}
    }
    else if(length){const projected=this.vx*wx+this.vz*wz,add=Math.max(0,Math.min(max-projected,this.config.airControl*length*dt));this.vx+=wx*add;this.vz+=wz*add;const cap=this.config.sprint*1.25,v=Math.hypot(this.vx,this.vz);if(v>cap){this.vx*=cap/v;this.vz*=cap/v;}}
    if((this.jumpBuffer>this.time||(autoJump&&keys.has('Space')))&&(this.grounded||this.time-this.lastGround<.09)){this.vy=Math.sqrt(2*24*this.config.jump);this.grounded=false;this.lastGround=-Infinity;this.jumpBuffer=0;this.slide=0;}
    this.x=Math.max(-this.boundary,Math.min(this.boundary,this.x+this.vx*dt));this.z=Math.max(-this.boundary,Math.min(this.boundary,this.z+this.vz*dt));
    const ground=this.groundHeight?.(this.x,this.z)??0;
    if(this.grounded){this.y=ground;this.vy=0;}else{this.vy-=24*dt;this.y+=this.vy*dt;if(this.y<=ground){this.y=ground;this.vy=0;this.grounded=true;}}
    this.travel+=Math.hypot(this.vx,this.vz)*dt;
    this.eye+=((crouch||this.slide>0?1.05:1.7)*this.config.size-this.eye)*(1-Math.exp(-18*dt));
    this.state=!this.grounded?'AIRBORNE':this.slide>0?'SLIDING':crouch?'CROUCHED':speed>.1?(sprint&&forward>0?'SPRINTING':'MOVING'):'GROUNDED';
  }
}
