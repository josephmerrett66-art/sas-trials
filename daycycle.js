// Game clock and light. One real second is one game minute, so a full day takes 24 minutes.
// Pure: no DOM or rendering, so it can be tested in node.
export const START_HOUR=9,WAKE_HOUR=5.5;
const smoothstep=(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t);};
// Sun height from -1/3 (midnight) to 1 (13:00); it crosses the horizon at 05:00 and 21:00.
export function sunHeight(hour){return (Math.cos(2*Math.PI*(hour-13)/24)+.5)/1.5;}
export function daylightAt(hour){return smoothstep(-.1,.22,sunHeight(hour));}
export function formatClock(hours){const day=Math.floor(hours/24)+1,h=hours%24,hh=Math.floor(h),mm=Math.floor((h-hh)*60);return `Day ${day} · ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;}

export class DayClock {
 constructor(){this.mode='cycle';this.reset();}
 reset(){this.hours=START_HOUR;}
 setMode(mode){if(!['cycle','day','night'].includes(mode))throw Error('Unknown time mode');this.mode=mode;}
 get hour(){return this.hours%24;}
 get day(){return Math.floor(this.hours/24)+1;}
 get label(){return formatClock(this.hours);}
 // Fixed modes keep the old always-day / always-night lighting but the clock still runs.
 get daylight(){return this.mode==='day'?1:this.mode==='night'?0:daylightAt(this.hour);}
 get darkness(){return 1-this.daylight;}
 // 0 at midday or midnight, 1 with the sun on the horizon: warms the sky and sunlight.
 get dusk(){if(this.mode!=='cycle')return 0;const s=sunHeight(this.hour);return Math.max(0,1-Math.abs(s-.06)/.22);}
 step(dt){this.hours+=dt/60;}
 advance(hours){this.hours+=hours;}
 // Hours until the next dawn wake-up time.
 untilWake(){const h=this.hour;return (WAKE_HOUR-h+24)%24||24;}
 // Sleep is only possible from dusk until shortly before dawn.
 get sleepable(){const h=this.hour;return h>=19.5||h<WAKE_HOUR-.5;}
}
