// Cosmetic motion only: physics, aiming input, and collisions stay independent.
export class LookSway {
  constructor(){this.output={x:0,y:0,roll:0,weaponYaw:0,weaponPitch:0};this.reset();}
  reset(){this.horizontal=0;this.vertical=0;for(const key in this.output)this.output[key]=0;}
  step(dt,x=0,y=0,intensity=1,aim=0){
    // The stick already passed through its dead zone. Smooth only the cosmetic motion.
    const blend=1-Math.exp(-14*Math.max(0,Math.min(dt,.05)));
    this.horizontal+=(Math.max(-1,Math.min(1,x))-this.horizontal)*blend;
    this.vertical+=(Math.max(-1,Math.min(1,y))-this.vertical)*blend;
    const strength=intensity*(1-Math.max(0,Math.min(1,aim))*.85),out=this.output;
    out.x=-this.horizontal*.012*strength;out.y=this.vertical*.008*strength;
    out.roll=-this.horizontal*.018*strength;
    out.weaponYaw=this.horizontal*.025*strength;out.weaponPitch=this.vertical*.018*strength;
    return out;
  }
}

export class MovementFeel {
  constructor(soundscape=null){this.reset();this.soundscape=soundscape;this.volume=.35;}
  reset(){this.phase=0;this.stride=0;this.bob=0;this.roll=0;this.dip=0;this.dipVelocity=0;this.shake=0;this.clock=0;this.fov=0;this.previousSlide=false;this.output={x:0,y:0,pitch:0,roll:0,fov:0};}
  unlockAudio(){return this.soundscape?.unlock();}
  sound(impact=1,landing=false){this.soundscape?.footstep(impact,landing,this.volume);}
  landed(velocity){const strength=Math.min(1.6,Math.max(0,(velocity-2)/9));this.dipVelocity-=strength*2.8;this.shake=Math.max(this.shake,strength);this.sound(strength,true);}
  jumped(){this.dipVelocity+=.65;}
  step(dt,player,intensity=1){
    this.clock+=dt;this.volume=player.config.footstepVolume??.35;
    const speed=Math.hypot(player.vx,player.vz),sliding=player.slide>0;
    const walking=player.grounded&&speed>.2&&!sliding;
    const blend=1-Math.exp(-12*dt);
    this.bob+=((walking?Math.min(1.35,speed/6):0)-this.bob)*blend;
    if(walking){const travelled=speed*dt;this.phase+=travelled*Math.PI/(player.state==='CROUCHED'?1.25:1.8);this.stride+=travelled;const spacing=player.state==='CROUCHED'?1.25:1.8;if(this.stride>=spacing){this.stride%=spacing;this.sound(player.state==='CROUCHED'?.3:Math.min(1.1,speed/7));}}else this.stride=0;
    if(sliding&&!this.previousSlide){this.dipVelocity-=.8;this.sound(.6,true);}this.previousSlide=sliding;
    // Critically damped landing spring, stable at the simulation's 120 Hz.
    this.dipVelocity+=(-180*this.dip-24*this.dipVelocity)*dt;this.dip+=this.dipVelocity*dt;
    this.shake*=Math.exp(-13*dt);
    const lateral=player.vx*Math.cos(player.yaw)-player.vz*Math.sin(player.yaw);
    this.roll+=((-lateral*.003+(sliding?.022:0))-this.roll)*blend;
    const targetFov=Math.min(6,Math.max(0,speed-player.config.walk)*1.2)+(sliding?2:0);
    this.fov+=(targetFov-this.fov)*(1-Math.exp(-7*dt));
    const shake=this.shake;
    this.output={x:(Math.cos(this.phase)*.018*this.bob+Math.sin(this.clock*47)*shake*.012)*intensity,y:(Math.cos(this.phase*2)*.027*this.bob+this.dip)*intensity,pitch:(Math.sin(this.phase*2)*.004*this.bob+this.dip*.18+Math.sin(this.clock*61)*this.shake*.009)*intensity,roll:(this.roll+Math.sin(this.phase)*.003*this.bob+Math.cos(this.clock*43)*this.shake*.006)*intensity,fov:this.fov*intensity};
    return this.output;
  }
}
