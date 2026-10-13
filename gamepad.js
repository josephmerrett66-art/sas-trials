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
    // The Xbox layout (standard mapping indices in brackets). Every survival choice lives in the
    // bag; out in the world only X, RT and LT act, and only on what the look-at label names.
    //  A [0] jump, or choose in the bag · B [1] crouch, or close the bag · X [2] use (hold to whittle or aim)
    //  Y [3] open or close the bag · LB/RB [4/5] lean · LT [6] / RT [7] the label's other actions
    //  View [8] map · Menu [9] pause · LS click [10] sprint · RS click [11] also the bag
    //  D-pad [12-15] or a flick of the left stick: move between actions in the bag
    const flick=(axis,sign)=>sign*pad.axes[axis]>.6,flicks=[flick(1,-1),flick(1,1),flick(0,-1),flick(0,1)],was=this.flicks??[false,false,false,false],flicked=i=>flicks[i]&&!was[i];this.flicks=flicks;
    const result={move:stick(pad.axes[0],pad.axes[1],deadzone),look:stick(pad.axes[2],pad.axes[3],deadzone,lookCurve,.98),jump:!!buttons[0],jumpPressed:pressed(0),crouch:!!buttons[1],sprint:!!buttons[10],pause:pressed(9),mapPressed:pressed(8),
      use:!!buttons[2],usePressed:pressed(2),bagPressed:pressed(3)||pressed(11),backPressed:pressed(1),firePressed:pressed(7),campPressed:pressed(6),
      upPressed:pressed(12)||flicked(0),downPressed:pressed(13)||flicked(1),leftPressed:pressed(14)||flicked(2),rightPressed:pressed(15)||flicked(3),
      leanLeft:!!buttons[4],leanRight:!!buttons[5],id:pad.id};
    this.previous=buttons;return result;
  }
}
