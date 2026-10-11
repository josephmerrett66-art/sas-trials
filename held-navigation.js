import {baseplateArtwork,dialArtwork} from './compass-art.js?v=1';
import {CompassHeading} from './compass-heading.js?v=1';
import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {NavigationArms} from './navigation-arms.js?v=always-held-1';
// One static chart texture and a small shared-material rig; no lights or shadow passes.
export class HeldNavigation {
 constructor(camera,chart){
  this.camera=camera;this.root=new THREE.Group();this.root.name='Held navigation equipment';camera.add(this.root);
  const paper=new THREE.MeshLambertMaterial({map:new THREE.CanvasTexture(chart),side:THREE.DoubleSide});paper.map.anisotropy=2;chart.addEventListener('chart-updated',()=>paper.map.needsUpdate=true);
  this.map=new THREE.Group();this.map.position.set(.06,-.82,-.68);this.map.rotation.set(-Math.PI/2+.12,0,-.08);this.root.add(this.map);
  const sheet=new THREE.Mesh(new THREE.PlaneGeometry(.68,.68),paper);this.map.add(sheet);
  this.compass=new THREE.Group();this.compass.position.set(-.34,-.72,-.64);this.compass.rotation.x=-Math.PI/2+.12;this.root.add(this.compass);
  // Clear baseplate, rulers, fixed travel arrow and bezel share the existing body draw.
  const plateTexture=new THREE.CanvasTexture(baseplateArtwork());plateTexture.anisotropy=2;
  const body=new THREE.Mesh(new THREE.PlaneGeometry(.29,.40),new THREE.MeshLambertMaterial({map:plateTexture,transparent:true}));body.position.y=.035;this.compass.add(body);this.headingIndex=body;
  this.heading=new CompassHeading();
  const dialTexture=new THREE.CanvasTexture(dialArtwork());dialTexture.anisotropy=2;
  const dial=new THREE.Mesh(new THREE.CircleGeometry(.100,32),new THREE.MeshLambertMaterial({map:dialTexture,transparent:true}));dial.position.z=.001;this.compass.add(dial);this.dial=dial;
  const shape=new THREE.Shape();shape.moveTo(0,.068);shape.lineTo(-.009,0);shape.lineTo(.009,0);shape.closePath();const geom=new THREE.ShapeGeometry(shape);
  this.needle=new THREE.Group();const north=new THREE.Mesh(geom,new THREE.MeshLambertMaterial({color:0xe02e26})),south=new THREE.Mesh(geom,new THREE.MeshLambertMaterial({color:0xf2f1e6}));south.rotation.z=Math.PI;this.needle.add(north,south);this.needle.position.z=.003;this.compass.add(this.needle);
  const arrow=geom.toNonIndexed(),pivot=new THREE.CircleGeometry(.006,12).toNonIndexed();pivot.translate(0,0,.0005);
  for(const [geometry,color] of [[arrow,new THREE.Color(0xe02e26)],[pivot,new THREE.Color(0xa6986c)]]){const colors=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));}
  north.geometry=mergeGeometries([arrow,pivot]);north.material.color.setHex(0xffffff);north.material.vertexColors=true;north.material.transparent=true;south.material.transparent=true;arrow.dispose();pivot.dispose();
  this.root.updateMatrixWorld(true);
  this.root.traverse(o=>{if(o.isMesh){o.material.depthTest=false;o.material.depthWrite=false;o.renderOrder=100;}});
  this.dial.renderOrder=101;this.needle.children.forEach(o=>o.renderOrder=102);north.renderOrder=103;
  this.arms=new NavigationArms(this.root);this.ready=this.arms.ready;
  this.root.visible=false;
 }
 update(player,dt=0,feel=null,active=true){
  this.heading.update(this.camera);
  this.root.visible=active;if(!active)return;
  // Equipment stays low in the world; looking down brings it into view.
  this.root.rotation.x=-player.pitch;
  this.arms.update(dt,player,feel);
  // Keep the chart edge and compass seated in the animated gun-arm grips.
  this.map.position.set(this.arms.right.x-.34,this.arms.right.y-.04,this.arms.right.z-.11);
  this.compass.position.set(this.arms.left.x,this.arms.left.y+.03,this.arms.left.z-.06);
  // Local +Y is the fixed forward marker. Positive Z rotation moves north left
  // as the camera turns east; both dial and red tip use the same horizontal heading.
  this.dial.rotation.z=this.heading.angle;this.needle.rotation.z=this.heading.angle;}
}
