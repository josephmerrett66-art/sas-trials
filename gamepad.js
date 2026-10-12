// Xbox controllers exposed through the browser's standard gamepad mapping.
export function stick(x=0,y=0,deadzone=.15,curve=1,outer=1){
  const magnitude=Math.hypot(x,y);
  if(magnitude<=deadzone)return {x:0,y:0};
  const response=Math.min(1,(magnitude-deadzone)/Math.max(.01,outer-deadzone));
  const scale=Math.pow(response,curve)/magnitude;
  return {x:x*scale,y:y*scale};
}
export class GamepadInput {
  constructor(){this.previous=[];this.index=null;}
  read(pads,deadzone=.15,lookCurve=1.6){
    const pad=Array.from(pads).find(p=>p?.connected&&p.mapping==='standard');
    if(!pad){this.previous=[];this.index=null;return null;}
    if(this.index!==pad.index){this.previous=[];this.index=pad.index;}
    const buttons=pad.buttons.map(b=>b.pressed);
    const pressed=i=>!!buttons[i]&&!this.previous[i];
    const result={move:stick(pad.axes[0],pad.axes[1],deadzone),look:stick(pad.axes[2],pad.axes[3],deadzone,lookCurve,.98),jump:!!buttons[0],jumpPressed:pressed(0),crouch:!!buttons[1],sprint:!!buttons[10],pause:pressed(9),mapPressed:pressed(8),respawn:pressed(3),aim:!!pad.buttons[6]?.pressed||((pad.buttons[6]?.value??0)>.2),fire:!!buttons[7],meleePressed:pressed(11),nextPressed:pressed(5),previousPressed:pressed(4),firePressed:pressed(7),reloadPressed:pressed(2),healPressed:pressed(12),drinkPressed:pressed(13),campPressed:pressed(6),bagPressed:pressed(11),backPressed:pressed(1),leftPressed:pressed(14),rightPressed:pressed(15),leanLeft:!!buttons[14],leanRight:!!buttons[15],id:pad.id};
    this.previous=buttons;return result;
  }
}
