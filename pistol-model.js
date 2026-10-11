import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

export function buildPistol(root){
  const material=(color,metalness=0)=>new THREE.MeshStandardMaterial({color,metalness,roughness:metalness?.38:.85,flatShading:true});
  const slideMetal=material(0x737780,.65),edgeMetal=material(0x40444a,.7),polymer=material(0x202226),rubber=material(0x101113),cloth=material(0x383a3d),skin=material(0xaaa9a5);
  const mesh=(parent,geometry,mat,position)=>{const object=new THREE.Mesh(geometry,mat);object.position.set(...position);parent.add(object);return object;};
  const box=(parent,size,position,mat,bevel=.003)=>{
    const [w,h,d]=size,shape=new THREE.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);shape.lineTo(w/2,h/2);shape.lineTo(-w/2,h/2);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*bevel,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,steps:1});geometry.translate(0,0,-d/2+bevel);
    return mesh(parent,geometry,mat,position);
  };
  const cylinder=(parent,radius,length,position,mat,segments=12)=>{const part=mesh(parent,new THREE.CylinderGeometry(radius,radius,length,segments),mat,position);part.rotation.x=Math.PI/2;return part;};
  const gun=new THREE.Group();root.add(gun);
  const slide=new THREE.Group();slide.position.set(0,.045,-.105);gun.add(slide);
  box(slide,[.072,.065,.29],[0,0,0],slideMetal,.005);
  box(slide,[.053,.012,.26],[0,.039,0],edgeMetal,.002);
  box(slide,[.054,.045,.011],[0,-.008,.153],rubber,.002);
  // Individual recessed serrations along both ends of the slide.
  for(const side of [-1,1])for(const rear of [true,false])for(let i=0;i<7;i++){
    const groove=box(slide,[.0015,.047,.0025],[side*.041,-.002,(rear?.085:-.13)+i*.006],edgeMetal,.0005);groove.rotation.x=-.12;
  }
  box(slide,[.032,.003,.064],[.012,.036,-.03],rubber,.001);
  box(slide,[.023,.004,.043],[.012,.038,-.03],edgeMetal,.001);
  // Low rear sight with a visible notch and front post.
  for(const side of [-1,1])box(slide,[.013,.014,.016],[side*.02,.053,.118],rubber,.001);
  box(slide,[.006,.013,.01],[0,.053,-.124],rubber,.001);
  for(const side of [-1,1])box(slide,[.003,.003,.001],[side*.018,.055,.128],skin,.0003);
  box(gun,[.066,.035,.24],[0,-.013,-.085],polymer,.004);
  box(gun,[.062,.023,.11],[0,-.039,-.145],edgeMetal,.002);
  const grip=new THREE.Group();grip.position.set(0,-.105,.029);grip.rotation.x=-.22;gun.add(grip);
  box(grip,[.062,.15,.08],[0,0,0],polymer,.007);
  for(const side of [-1,1]){
    box(grip,[.005,.115,.058],[side*.037,0,.002],rubber,.003);
    for(let row=0;row<9;row++)box(grip,[.006,.003,.048],[side*.04,-.05+row*.012,.002],cloth,.0005);
  }
  const magazine=box(gun,[.073,.016,.092],[0,-.188,.046],rubber,.003);
  // Trigger guard built as a continuous hollow frame rather than a solid block.
  const guardShape=new THREE.Shape();guardShape.moveTo(-.034,-.025);guardShape.lineTo(.036,-.025);guardShape.lineTo(.044,-.075);guardShape.lineTo(.032,-.101);guardShape.lineTo(-.034,-.101);guardShape.closePath();
  const hole=new THREE.Path();hole.moveTo(-.025,-.037);hole.lineTo(-.025,-.087);hole.lineTo(.023,-.087);hole.lineTo(.031,-.071);hole.lineTo(.023,-.037);hole.closePath();guardShape.holes.push(hole);
  const guard=mesh(gun,new THREE.ExtrudeGeometry(guardShape,{depth:.009,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1}),polymer,[0,0,-.072]);guard.rotation.y=Math.PI/2;
  const trigger=box(gun,[.009,.035,.013],[0,-.057,-.076],edgeMetal,.002);trigger.rotation.x=-.3;
  box(gun,[.008,.012,.032],[-.042,-.018,.007],edgeMetal,.001);
  cylinder(gun,.006,.004,[-.043,-.03,.04],edgeMetal,8).rotation.z=Math.PI/2;
  cylinder(gun,.025,.038,[0,.043,-.277],edgeMetal);
  cylinder(gun,.036,.235,[0,.043,-.408],polymer,12);
  for(let i=0;i<4;i++)cylinder(gun,.038,.006,[0,.043,-.302-i*.014],edgeMetal);
  cylinder(gun,.033,.011,[0,.043,-.531],edgeMetal);
  cylinder(gun,.013,.012,[0,.043,-.538],rubber);
  for(let i=0;i<8;i++){const angle=i*Math.PI/4;box(gun,[.003,.003,.175],[Math.cos(angle)*.036,.043+Math.sin(angle)*.036,-.427],edgeMetal,.0005);}
  const right=new THREE.Group(),left=new THREE.Group();root.add(right,left);
  // Narrow wrists, separate palms, segmented fingers, and thumb wrap.
  const hand=(parent,side)=>{
    const forearm=box(parent,[.08,.085,.29],[side*.035,-.105,.18],cloth,.009);forearm.rotation.x=-.3;forearm.rotation.z=side*.2;
    box(parent,[.085,.074,.035],[0,-.079,.046],rubber,.006);
    const palm=box(parent,[.065,.095,.046],[0,-.08,.015],cloth,.006);palm.rotation.x=-.15;
    box(parent,[.045,.055,.006],[side*.019,-.073,.041],polymer,.003);
    for(let i=0;i<3;i++){
      const y=-.055-i*.025;
      box(parent,[.055,.019,.026],[-side*.008,y,-.029],cloth,.003);
      box(parent,[.021,.018,.028],[-side*.035,y,-.013],rubber,.003);
    }
    const thumb=box(parent,[.022,.043,.048],[side*.035,-.045,-.01],cloth,.004);thumb.rotation.z=-side*.55;
    box(parent,[.017,.018,.019],[side*.026,-.031,-.035],skin,.003);
  };
  hand(right,1);hand(left,-1);left.position.set(-.052,-.018,-.033);left.rotation.z=-.14;
  // Batch static parts by material while preserving animated slide/magazine/hands.
  for(const group of [gun,slide,grip,right,left]){
    const batches=new Map();
    for(const part of [...group.children]){
      if(!part.isMesh||part===magazine)continue;
      part.updateMatrix();const geometry=part.geometry.clone().applyMatrix4(part.matrix);
      if(!batches.has(part.material))batches.set(part.material,[]);
      batches.get(part.material).push({part,geometry});
    }
    for(const [material,entries] of batches){
      const geometry=mergeGeometries(entries.map(entry=>entry.geometry.index?entry.geometry.toNonIndexed():entry.geometry),false);
      if(geometry){for(const entry of entries){group.remove(entry.part);entry.part.geometry.dispose();entry.geometry.dispose();}group.add(new THREE.Mesh(geometry,material));}
    }
  }
  root.traverse(object=>{if(object.isMesh){object.layers.set(1);object.frustumCulled=false;}});
  return {gun,slide,magazine,right,left};
}
