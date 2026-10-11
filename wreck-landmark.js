import {landmarkMaterial} from './landmark-builder.js?v=1-r1';
import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {terrainHeight} from './terrain.js?v=river-1';
import {SECOND_CONTROL} from './second-control.js?v=irregular-route-1';

// Build once: all body panels, burned interior, wheels and corrosion share one draw.
export function createWreckLandmark(scene){
 const pieces=[],matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1),position=new THREE.Vector3(),color=new THREE.Color();
 const part=(geometry,tint,x,y,z,rx=0,ry=0,rz=0)=>{
  if(geometry.index){const source=geometry;geometry=source.toNonIndexed();source.dispose();}
  q.setFromEuler(new THREE.Euler(rx,ry,rz));position.set(x,y,z);matrix.compose(position,q,scale);geometry.applyMatrix4(matrix);
  color.setHex(tint);const colors=new Float32Array(geometry.attributes.position.count*3);
  for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.deleteAttribute('uv');pieces.push(geometry);
 };
 const box=(w,h,d,tint,x,y,z,rx=0,ry=0,rz=0)=>part(new THREE.BoxGeometry(w,h,d),tint,x,y,z,rx,ry,rz);
 const rust=0x89452b,orange=0xac633c,char=0x242522,metal=0x555b57;
 box(2.15,.48,5.4,rust,0,.68,0); // long sedan shell
 box(1.92,.12,2.85,char,0,.96,.1); // burned cabin floor
 box(2.02,.16,1.45,orange,0,1.06,-1.99,-.12); // buckled bonnet
 box(2.05,.15,1.18,rust,0,1.01,2.02,.06);
 for(const side of [-1,1]){
  box(.12,.42,2.7,rust,side*1.06,1.1,.04); // scorched doors with open windows
  box(.1,.79,.1,char,side*.99,1.68,-1.15,.36);
  box(.1,.74,.1,metal,side*.99,1.66,1.13,-.34);
  box(.1,.75,.1,char,side*1.02,1.67,.12);
  box(.12,.12,2.13,metal,side*.99,2.03,.06);
  box(.16,.045,.39,metal,side*1.13,1.24,.47); // door handle
  // Large irregular exposed-orange patches make the wreck recognisable at a distance.
  for(const [z,w,h] of [[-1.75,.65,.23],[-.6,.5,.29],[.8,.8,.26],[2.1,.4,.2]])box(.014,h,w,orange,side*1.13,.73,z,0,.03,side*.08);
  for(const z of [-1.65,1.65]){
   part(new THREE.CylinderGeometry(.51,.51,.29,10),char,side*1.12,.53,z,0,0,Math.PI/2);
   part(new THREE.CylinderGeometry(.27,.27,.305,8),metal,side*1.12,.53,z,0,0,Math.PI/2);
   part(new THREE.CylinderGeometry(.1,.1,.32,6),rust,side*1.12,.53,z,0,0,Math.PI/2);
  }
 }
 box(1.9,.1,.12,metal,0,2.03,-.98);box(1.9,.1,.12,char,0,2.03,1.03);
 // Torn roof remnants leave the blackened seats visible through the empty windows.
 box(.57,.07,1.95,char,-.67,2.04,.02,0,0,-.08);
 box(.6,.07,.85,rust,.67,2.05,.56,.17,0,.12);
 for(const x of [-.5,.5])for(const z of [-.5,.74]){box(.68,.15,.64,char,x,1.07,z);box(.68,.55,.15,char,x,1.32,z+.28,-.12);}
 box(1.96,.14,.17,metal,0,.53,-2.78,0,.07,.06);box(1.96,.14,.17,rust,0,.54,2.78,0,-.04);
 box(.96,.22,.06,char,0,.82,-2.73); // empty grille
 for(const x of [-.76,.76]){box(.39,.19,.07,0x9a9b80,x,.86,-2.73);box(.3,.13,.06,0x77352b,x,.88,2.73);}
 const geometry=mergeGeometries(pieces,false);for(const piece of pieces)piece.dispose();geometry.computeBoundingSphere();
 const material=landmarkMaterial();
 const mesh=new THREE.InstancedMesh(geometry,material,1);mesh.name='Burned-out rusted car';
 const car=SECOND_CONTROL.car;position.set(car.x,terrainHeight(car.x,car.z),car.z);
 const slopeX=(terrainHeight(car.x+1,car.z)-terrainHeight(car.x-1,car.z))/2;
 const slopeZ=(terrainHeight(car.x,car.z+1)-terrainHeight(car.x,car.z-1))/2;
 q.setFromEuler(new THREE.Euler(-Math.atan(slopeZ),0,Math.atan(slopeX)));matrix.compose(position,q,scale);mesh.setMatrixAt(0,matrix);mesh.computeBoundingSphere();
 mesh.castShadow=false;mesh.receiveShadow=false;scene.add(mesh);return mesh;
}
