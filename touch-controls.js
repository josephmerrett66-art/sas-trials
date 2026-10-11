export function stickPosition(dx,dy,radius=44,out={x:0,y:0}){const distance=Math.hypot(dx,dy),scale=distance>radius?radius/distance:1;out.x=dx*scale/radius;out.y=dy*scale/radius;if(distance<5)out.x=out.y=0;return out;}
export function createTouchControls(canvas,{enabled,canMove,look,jump,pause}){
 const move={x:0,y:0};let moveId=null,lookId=null,sprintId=null,lastX=0,lastY=0,cx=0,cy=0;
 const panel=document.createElement('div');panel.id='touch-controls';panel.innerHTML='<button id="touch-stick" aria-label="Movement joystick"><span></span></button><div class="touch-actions"><button id="touch-sprint">Run</button><button id="touch-jump">Jump</button></div><button id="touch-pause">Pause</button><span class="touch-guide">Drag the scene to look</span>';document.body.appendChild(panel);document.body.classList.toggle('touch-mode',enabled);
 const stick=panel.querySelector('#touch-stick'),knob=stick.firstChild,sprint=panel.querySelector('#touch-sprint');const controls={enabled,move,sprint:false,reset(){move.x=move.y=0;moveId=lookId=sprintId=null;controls.sprint=false;knob.style.transform='translate(0,0)';sprint.classList.remove('held');}};
 function start(e,element){e.preventDefault();element.setPointerCapture(e.pointerId);}
 stick.onpointerdown=e=>{if(!canMove()||moveId!==null)return;start(e,stick);moveId=e.pointerId;const r=stick.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;update(e);};
 function update(e){if(e.pointerId!==moveId)return;if(!canMove()){controls.reset();return;}stickPosition(e.clientX-cx,e.clientY-cy,44,move);knob.style.transform=`translate(${move.x*44}px,${move.y*44}px)`;}
 stick.onpointermove=update;const release=e=>{if(e.pointerId===moveId){moveId=null;move.x=move.y=0;knob.style.transform='translate(0,0)';}};stick.onpointerup=stick.onpointercancel=stick.onlostpointercapture=release;
 canvas.addEventListener('pointerdown',e=>{if(!enabled||e.pointerType!=='touch'||!canMove()||lookId!==null)return;start(e,canvas);lookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;});
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;if(canMove())look(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY;});const endLook=e=>{if(e.pointerId===lookId)lookId=null;};for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,endLook);
 sprint.onpointerdown=e=>{if(!canMove()||sprintId!==null)return;start(e,sprint);sprintId=e.pointerId;controls.sprint=true;sprint.classList.add('held');};const endSprint=e=>{if(e.pointerId===sprintId){sprintId=null;controls.sprint=false;sprint.classList.remove('held');}};sprint.onpointerup=sprint.onpointercancel=sprint.onlostpointercapture=endSprint;
 panel.querySelector('#touch-jump').onpointerdown=e=>{e.preventDefault();if(canMove())jump();};panel.querySelector('#touch-pause').onclick=pause;
 return controls;
}
