import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {NavigationArms} from './navigation-arms.js?v=held-arms-1';
// One static chart texture and a small shared-material rig; no lights or shadow passes.
export class HeldNavigation {
 constructor(camera,chart){
  this.camera=camera;this.root=new THREE.Group();this.root.name='Held navigation equipment';camera.add(this.root);
  const paper=new THREE.MeshLambertMaterial({map:new THREE.CanvasTexture(chart),side:THREE.DoubleSide});paper.map.anisotropy=2;chart.addEventListener('chart-updated',()=>paper.map.needsUpdate=true);
  const rim=new THREE.MeshLambertMaterial({color:0x424940});
  this.map=new THREE.Group();this.map.position.set(.06,-.82,-.68);this.map.rotation.set(-Math.PI/2+.12,0,-.08);this.root.add(this.map);
  const sheet=new THREE.Mesh(new THREE.PlaneGeometry(.68,.68),paper);this.map.add(sheet);
  this.compass=new THREE.Group();this.compass.position.set(-.34,-.72,-.64);this.compass.rotation.x=-Math.PI/2+.12;this.root.add(this.compass);
  // A fixed forward index is part of the existing bezel draw, not another mesh.
  const circle=new THREE.CircleGeometry(.105,24).toNonIndexed(),indexShape=new THREE.Shape();indexShape.moveTo(0,.095);indexShape.lineTo(-.012,.117);indexShape.lineTo(.012,.117);indexShape.closePath();
  const index=new THREE.ShapeGeometry(indexShape).toNonIndexed();index.translate(0,0,.004);
  for(const [geometry,color] of [[circle,new THREE.Color(0x424940)],[index,new THREE.Color(0xe6b869)]]){const colors=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));}
  rim.color.setHex(0xffffff);rim.vertexColors=true;
  const body=new THREE.Mesh(mergeGeometries([circle,index]),rim);this.compass.add(body);circle.dispose();index.dispose();this.headingIndex=body;
  this.magneticNorth=new THREE.Vector3();this.compassOrientation=new THREE.Quaternion();
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#ded8b5';c.fillRect(0,0,256,256);c.translate(128,128);c.strokeStyle='#303a30';c.lineWidth=2;
  for(let i=0;i<72;i++){c.save();c.rotate(i*Math.PI/36);c.beginPath();c.moveTo(0,-118);c.lineTo(0,i%18===0?-98:i%6===0?-104:-112);c.stroke();if(i%6===0&&i%18!==0){c.font='12px monospace';c.textAlign='center';c.fillStyle='#303a30';c.fillText(String(i*5),0,-90);}c.restore();}c.textAlign='center';c.textBaseline='middle';c.font='bold 27px monospace';[['N',0,-74],['E',74,0],['S',0,74],['W',-74,0]].forEach(([t,x,y])=>{c.fillStyle=t==='N'?'#a3392b':'#303a30';c.fillText(t,x,y);});
  const dial=new THREE.Mesh(new THREE.CircleGeometry(.093,24),new THREE.MeshLambertMaterial({map:new THREE.CanvasTexture(canvas)}));dial.position.z=.001;this.compass.add(dial);this.dial=dial;
  const shape=new THREE.Shape();shape.moveTo(0,.062);shape.lineTo(-.009,0);shape.lineTo(.009,0);shape.closePath();const geom=new THREE.ShapeGeometry(shape);
  this.needle=new THREE.Group();const north=new THREE.Mesh(geom,new THREE.MeshLambertMaterial({color:0xa3392b})),south=new THREE.Mesh(geom,new THREE.MeshLambertMaterial({color:0xeeeece}));south.rotation.z=Math.PI;this.needle.add(north,south);this.needle.position.z=.003;this.compass.add(this.needle);
  this.root.updateMatrixWorld(true);
  this.root.traverse(o=>{if(o.isMesh){o.material.depthTest=false;o.material.depthWrite=false;o.renderOrder=100;}});
  this.dial.renderOrder=101;this.needle.children.forEach(o=>o.renderOrder=102);
  this.arms=new NavigationArms(this.root);this.ready=this.arms.ready;
  this.root.visible=false;
 }
 update(player,held,dt=0,feel=null,active=held){
  this.root.visible=active;this.map.visible=this.compass.visible=held;if(!active)return;
  // Equipment stays low in the world; looking down brings it into view.
  this.root.rotation.x=-player.pitch;
  this.arms.update(dt,player,held,feel);
  if(!held)return;
  // Keep the chart edge and compass seated in the animated gun-arm grips.
  this.map.position.set(this.arms.right.x-.34,this.arms.right.y-.04,this.arms.right.z-.11);
  this.compass.position.set(this.arms.left.x,this.arms.left.y+.03,this.arms.left.z-.06);
  // Project fixed world north into the held dial plane, including look and lean.
  this.compassOrientation.copy(this.camera.quaternion).multiply(this.root.quaternion).multiply(this.compass.quaternion);
  this.magneticNorth.set(0,0,-1).applyQuaternion(this.compassOrientation.invert());
  const northAngle=Math.atan2(-this.magneticNorth.x,this.magneticNorth.y);
  this.dial.rotation.z=northAngle;this.needle.rotation.z=northAngle;}
}
