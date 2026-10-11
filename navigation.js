import {riverClearance} from './landmark-routes.js?v=gullies-1';
import {terrainHeight,WORLD_SIZE} from './terrain.js?v=gullies-1';
export const START={x:0,z:12};
export const bearing=yaw=>((Math.round(-yaw*180/Math.PI)%360)+360)%360;
export function gridReference(x,z,size=WORLD_SIZE){const cell=size/8;return String.fromCharCode(65+Math.max(0,Math.min(7,Math.floor((x+size/2)/cell))))+(Math.max(0,Math.min(7,Math.floor((z+size/2)/cell)))+1);}
export function makeCheckpoints(obstacles=[]){
 const half=WORLD_SIZE/2;
 const clear=(x,z)=>riverClearance(x,z)>6&&obstacles.every(o=>Math.hypot(x-o.x,z-o.z)>o.radius+1.3);
 const find=(x,z)=>{for(let radius=0;radius<=32;radius+=2)for(let i=0;i<24;i++){const angle=i*Math.PI/12,px=x+Math.cos(angle)*radius,pz=z+Math.sin(angle)*radius;if(Math.abs(px)<half-45&&Math.abs(pz)<half-45&&clear(px,pz))return {x:px,z:pz};}throw Error('No accessible checkpoint site');};
 // Clockwise circuit through the outer valleys and ridges; coordinates stay private until each leg is unlocked.
 const sites=[[-.36,-.40],[.40,-.42],[.42,-.03],[.40,.40],[-.05,.42],[-.42,.40],[-.42,-.05],[-.08,-.42]];
 return sites.map(([x,z],i)=>{const p=find(x*WORLD_SIZE,z*WORLD_SIZE);return {code:String.fromCharCode(65+i),...p,y:terrainHeight(p.x,p.z),grid:gridReference(p.x,p.z),title:'Wilderness circuit',description:'Use the chart and compass to choose your route to these coordinates. The wooden post holds the next destination; register it when you arrive.'};});
}
export const coordinates=p=>({east:Math.round(p.x+WORLD_SIZE/2),north:Math.round(WORLD_SIZE/2-p.z)});
export class NavigationExercise {
 constructor(checkpoints){this.checkpoints=checkpoints;this.reset();}
 reset(){this.stage=0;this.distance=0;this.elevation=0;this.message='';this.messageTime=0;this.previous=null;}
 get revealed(){return this.checkpoints.slice(0,Math.min(this.stage+1,this.checkpoints.length));}
 get current(){return this.checkpoints[this.stage]??null;}
 get complete(){return this.stage===this.checkpoints.length;}
 nearby(player){for(const point of this.checkpoints)if(Math.hypot(player.x-point.x,player.z-point.z)<=2.8&&Math.abs(player.y-point.y)<3)return point;return null;}
 interact(player){
  const point=this.nearby(player);if(!point||this.complete)return false;
  if(point!==this.current){this.message=`Post ${point.code}. Your assignment is checkpoint ${this.current.code}.`;this.messageTime=4;return false;}
  this.stage++;this.message=this.complete?`Checkpoint ${point.code} — Circuit complete`:`Checkpoint ${point.code} — Next coordinates recorded`;this.messageTime=5;return true;
 }
 step(dt,player){
  this.messageTime=Math.max(0,this.messageTime-dt);if(dt<=0||this.complete)return;
  if(this.previous){const d=Math.hypot(player.x-this.previous.x,player.z-this.previous.z);this.distance+=d;this.elevation+=Math.max(0,terrainHeight(player.x,player.z)-terrainHeight(this.previous.x,this.previous.z));}
  else this.previous={x:player.x,z:player.z};
  this.previous.x=player.x;this.previous.z=player.z;
 }
}
