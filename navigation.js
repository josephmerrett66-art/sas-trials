import {CONTROL_LANDMARKS} from './control-landmarks.js?v=big-1';
import {SECOND_CONTROL} from './second-control.js?v=big-1';
import {FIRST_CONTROL} from './first-control.js?v=big-1';
import {terrainHeight,WORLD_SIZE} from './terrain.js?v=valleys-1';
export const START={x:0,z:12};
export const bearing=yaw=>((Math.round(-yaw*180/Math.PI)%360)+360)%360;
export function gridReference(x,z,size=WORLD_SIZE){const cell=size/8;return String.fromCharCode(65+Math.max(0,Math.min(7,Math.floor((x+size/2)/cell))))+(Math.max(0,Math.min(7,Math.floor((z+size/2)/cell)))+1);}
export function makeCheckpoints(obstacles=[]){
 const controls=[
  {post:FIRST_CONTROL.post,feature:FIRST_CONTROL.north,attack:FIRST_CONTROL.attack,title:'Twin boulders',postRotation:Math.PI/2,controlDescription:'Northern boulder of the pair, east side.',description:'Follow the valley trail north to its west-facing bend in grid D1. Use the bend as your approach point, then head northwest to the two boulders. Identify the northern rock and check its east side for post A. Match the letter before registering.'},
  {post:SECOND_CONTROL.post,feature:SECOND_CONTROL.car,title:'Burned-out car',postRotation:0,controlDescription:'Burned-out car, rear (south) end.',description:'Work southeast from A into grid F3. Cross the valley trail, then check both coordinates before searching for the rusty burned-out car. Its empty windows, buckled bonnet and scorched interior make it unlike anything else in the forest. Find post B behind the rear bumper, at the south end of the wreck. Match the letter before registering.'},
  ...CONTROL_LANDMARKS.map(c=>({...c,title:c.name,description:c.description+' Match the letter before registering.'}))
 ];
 return controls.map((control,i)=>{const {post,kind,radius,height,name,...clue}=control;return {...clue,code:String.fromCharCode(65+i),...post,y:terrainHeight(post.x,post.z),grid:gridReference(post.x,post.z)};});
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
