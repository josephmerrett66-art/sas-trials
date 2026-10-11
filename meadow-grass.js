import * as THREE from './vendor/three.module.js';

// A small carpet tile, with independent bent blades rather than a radial bush.
// Three opaque triangles per blade keep both the silhouette and overdraw bounded.
export function meadowGrassGeometry(){
  const positions=[],colors=[],root=new THREE.Color(0x65833d),tip=new THREE.Color(0x9aac69);
  let seed=9127;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const vertex=(x,y,z,h,shade)=>{positions.push(x,y,z);const color=root.clone().lerp(tip,Math.max(0,y/h)).multiplyScalar(shade);colors.push(color.r,color.g,color.b);};
  for(let i=0;i<72;i++){
    const x=((i%9)+random())/9*1.2-.6,z=(Math.floor(i/9)+random())/8*1.2-.6,angle=random()*Math.PI*2;
    const width=.02+random()*.012,height=.26+random()*.18,lean=.09+random()*.12,dx=Math.sin(angle),dz=Math.cos(angle),sx=dz*width,sz=-dx*width,shade=.87+random()*.23;
    const a=[x-sx,-.025,z-sz],b=[x+sx,-.025,z+sz],c=[x+dx*lean*.3-sx*.6,height*.58,z+dz*lean*.3-sz*.6],d=[x+dx*lean*.3+sx*.6,height*.58,z+dz*lean*.3+sz*.6],e=[x+dx*lean,height,z+dz*lean];
    for(const v of [a,b,c,b,d,c,c,d,e])vertex(...v,height,shade);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}

// Distant blades retain the meadow silhouette with a small fraction of the triangles.
export function distantGrassGeometry(source){
 const p=source.attributes.position,c=source.attributes.color,positions=[],colors=[];
 for(let blade=0;blade<72;blade+=3)for(const offset of [0,1,8]){const i=blade*9+offset;positions.push(p.getX(i),p.getY(i),p.getZ(i));colors.push(c.getX(i),c.getY(i),c.getZ(i));}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}
