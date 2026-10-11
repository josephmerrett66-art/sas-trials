import {trails} from './landmark-routes.js?v=no-river-1';
import * as THREE from './vendor/three.module.js';
import {terrainHeight,WORLD_SIZE} from './terrain.js?v=gullies-1';
import {START,bearing,gridReference,coordinates} from './navigation.js?v=no-river-1';

export function addCheckpointPosts(scene,points){
 const groups=[];
 const timber=new THREE.MeshLambertMaterial({color:0x776046}),postGeometry=new THREE.BoxGeometry(.18,1.3,.18),boardGeometry=new THREE.BoxGeometry(.65,.5,.12);
 for(const point of points){
  const group=new THREE.Group();group.position.set(point.x,point.y,point.z);group.name=`Checkpoint ${point.code}`;
  const post=new THREE.Mesh(postGeometry,timber);post.position.y=.65;group.add(post);
  const board=new THREE.Mesh(boardGeometry,timber);board.position.y=1.5;group.add(board);
  const label=document.createElement('canvas');label.width=128;label.height=96;const ctx=label.getContext('2d');ctx.fillStyle='#d3be8b';ctx.fillRect(0,0,128,96);ctx.fillStyle='#29281f';ctx.textAlign='center';ctx.font='bold 62px monospace';ctx.fillText(point.code,64,69);
  const texture=new THREE.CanvasTexture(label),face=new THREE.Mesh(new THREE.PlaneGeometry(.56,.42),new THREE.MeshLambertMaterial({map:texture,side:THREE.DoubleSide}));face.position.set(0,1.5,.065);group.add(face);const back=face.clone();back.rotation.y=Math.PI;back.position.z=-.065;group.add(back);scene.add(group);groups.push(group);
 }
 return groups;
}
export class NavigationView {
 constructor(exercise){
  this.exercise=exercise;this.panel=null;this.compassOpen=false;this.equipmentHeld=false;this.renderedStage=-1;
  this.map=document.querySelector('#map-sheet');this.journal=document.querySelector('#assignment');this.compass=document.querySelector('#compass');this.notice=document.querySelector('#nav-notice');this.prompt=document.querySelector('#nav-prompt');this.summary=document.querySelector('#completion');
  this.chart=document.querySelector('#nav-chart');this.chart.width=800;this.chart.height=800;this.updateAssignment();
 }
 get blocking(){return !!this.panel||this.exercise.complete;}
 close(){this.panel=null;this.map.hidden=true;this.journal.hidden=true;}
 toggle(panel){if(panel==='map'||panel==='compass'){this.equipmentHeld=!this.equipmentHeld;this.compassOpen=this.equipmentHeld;this.close();this.compass.hidden=true;return;}const next=this.panel===panel?null:panel;this.close();this.panel=next;if(next==='map')this.map.hidden=false;if(next==='assignment')this.journal.hidden=false;}
 reset(){this.equipmentHeld=false;this.compassOpen=false;this.close();this.summary.hidden=true;this.renderedStage=-1;this.updateAssignment();}
 updateAssignment(){
  const current=this.exercise.current;this.renderedStage=this.exercise.stage;this.drawMap();
  document.querySelector('#assignment-copy').innerHTML=current?`<span class="eyebrow">NAVIGATION EXERCISE ${String(this.exercise.stage+1).padStart(2,'0')}</span><h2>Checkpoint ${current.code}</h2><p class="grid-ref">Grid ${current.grid}</p><p class="coordinates">E ${coordinates(current).east} · N ${coordinates(current).north} m</p><p>${current.description}</p><p class="muted">Equipment: map and compass.<br>North is map north. Coordinates start at the south-west corner of the chart.<br>The next destination is revealed at this post. No time limit.</p><p>${this.exercise.stage} / ${this.exercise.checkpoints.length} checkpoints registered</p>`:'';
 }
 update(player){
  if(this.renderedStage!==this.exercise.stage){this.updateAssignment();if(!this.exercise.complete){this.close();this.toggle('assignment');}}
  const heading=bearing(player.yaw);if(this.compassOpen){document.querySelector('#compass-card').style.transform=`rotate(${-heading}deg)`;document.querySelector('#bearing').textContent=`${String(heading).padStart(3,'0')}°`;}
  const near=this.exercise.nearby(player);this.prompt.textContent=near&&!this.exercise.complete?(this.exercise.checkpoints.indexOf(near)<this.exercise.stage?`Post ${near.code} · Reached`:`Post ${near.code} · G / Xbox X to register`):'';
  this.notice.textContent=this.exercise.messageTime>0?this.exercise.message:'';
  if(this.exercise.complete){this.close();this.summary.hidden=false;document.querySelector('#summary-copy').textContent=`${this.exercise.checkpoints.length} / ${this.exercise.checkpoints.length} checkpoints reached · ${Math.round(this.exercise.distance)} m travelled · ${Math.round(this.exercise.elevation)} m elevation gained`;}
 }
 drawMap(){
  const ctx=this.chart.getContext('2d'),margin=48,span=704,half=WORLD_SIZE/2,step=4,px=x=>margin+(x+half)/WORLD_SIZE*span,pz=z=>margin+(z+half)/WORLD_SIZE*span;
  if(!this.baseChart){
  ctx.fillStyle='#e5d9b8';ctx.fillRect(0,0,800,800);
  const colors=['#d5dfc7','#c7d3b6','#b5c5a1','#a4b48b','#91a278','#809367','#71845c','#60734e'];
  for(let y=0;y<span;y+=step)for(let x=0;x<span;x+=step){const wx=x/span*WORLD_SIZE-half,wz=y/span*WORLD_SIZE-half,h=terrainHeight(wx,wz),band=Math.floor((h+25)/7);ctx.fillStyle=colors[Math.max(0,Math.min(colors.length-1,band))];ctx.fillRect(margin+x,margin+y,step,step);const hx=terrainHeight(wx+step/span*WORLD_SIZE,wz),hz=terrainHeight(wx,wz+step/span*WORLD_SIZE);if(Math.floor(h/7)!==Math.floor(hx/7)||Math.floor(h/7)!==Math.floor(hz/7)){ctx.fillStyle='#4b654650';ctx.fillRect(margin+x,margin+y,2,2);}}
  for(const route of trails){ctx.beginPath();for(let z=route.start;z<=route.end;z+=2){z===route.start?ctx.moveTo(px(route.center(z)),pz(z)):ctx.lineTo(px(route.center(z)),pz(z));}ctx.strokeStyle='#7c5c3f';ctx.lineWidth=2.5;ctx.stroke();}
  ctx.strokeStyle='#3c483d66';ctx.lineWidth=1;ctx.fillStyle='#303b31';ctx.font='bold 23px monospace';ctx.textAlign='center';
  for(let i=0;i<=8;i++){const t=margin+i*span/8;ctx.beginPath();ctx.moveTo(t,margin);ctx.lineTo(t,margin+span);ctx.moveTo(margin,t);ctx.lineTo(margin+span,t);ctx.stroke();if(i<8){ctx.fillText(String.fromCharCode(65+i),t+span/16,32);ctx.fillText(String(i+1),26,t+span/16+5);}}
  this.baseChart=document.createElement('canvas');this.baseChart.width=800;this.baseChart.height=800;this.baseChart.getContext('2d').drawImage(this.chart,0,0);
  }else ctx.drawImage(this.baseChart,0,0);
  ctx.textAlign='center';ctx.font='bold 24px monospace';
  const mark=(p,text,color)=>{ctx.strokeStyle=color;ctx.fillStyle='#f5ecd6';ctx.lineWidth=3;ctx.beginPath();ctx.arc(px(p.x),pz(p.z),10,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.fillText(text,px(p.x)+22,pz(p.z)-14);};
  mark(START,'START','#303b31');for(const p of this.exercise.revealed)mark(p,p.code,p===this.exercise.current?'#8e3e2d':'#52614d');
  ctx.textAlign='left';ctx.font='14px monospace';ctx.fillStyle='#303b31';ctx.fillText(`N ↑ · E → / N ↑ from SW corner · Grid ${WORLD_SIZE/8} m · Elevation 7 m`,48,781);
  this.chart.dispatchEvent(new Event('chart-updated'));
  document.querySelector('#map-legend').textContent=`Fixed north-up chart · Start ${gridReference(START.x,START.z)} · Brown line: dirt track · Darker green: higher ground. Only visited posts and the current destination are marked. Future destinations are sealed. No live position is shown.`;
 }
}
