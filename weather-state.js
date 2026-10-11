const cycle=[['clear',70],['wind',45],['rain',90],['storm',70],['rain',45]];
const profiles={clear:[0,0,0],wind:[0,1,.45],rain:[.6,.45,.7],storm:[1,1,1]};
export class WeatherState {
 constructor(mode='auto'){this.mode='auto';this.time=0;this.rain=0;this.wind=0;this.cloud=0;this.flash=0;this.strike=false;this.nextStrike=8;this.strikeTime=-10;this.setMode(mode);}
 setMode(mode){if(mode!=='auto'&&!profiles[mode])throw Error('Unknown weather');this.mode=mode;this.nextStrike=this.time+8;this.strikeTime=-10;this.flash=0;}
 step(dt,active=true,lightning=true){
  dt=Math.max(0,Math.min(dt,.1));if(active)this.time+=dt;
  let target=this.mode;if(target==='auto'){let position=this.time%320;for(const [name,duration] of cycle){target=name;if(position<duration)break;position-=duration;}}
  this.current=target;const profile=profiles[target],blend=1-Math.exp(-dt/3);
  this.rain+=(profile[0]-this.rain)*blend;this.wind+=(profile[1]-this.wind)*blend;this.cloud+=(profile[2]-this.cloud)*blend;
  this.gust=this.wind*(.65+.35*Math.sin(this.time*.7)**2);this.strike=false;
  if(active&&target==='storm'&&this.time>=this.nextStrike){this.strike=true;this.strikeTime=this.time;this.nextStrike=this.time+23+7*(.5+.5*Math.sin(this.time*2.17));}
  const age=this.time-this.strikeTime;this.flash=active&&lightning&&target==='storm'?(age<.12?Math.sin(age/.12*Math.PI):age>.23&&age<.31?.5*Math.sin((age-.23)/.08*Math.PI):0):0;
 }
}
