import * as THREE from './vendor/three.module.js';
const cache=new Map();
// Pack several frequencies into RGB once; surfaces sample one mipmapped tile.
export function detailAtlas(kind){
 if(cache.has(kind))return cache.get(kind);
 const size=256,period=32,data=new Uint8Array(size*size*4),grids=new Map();
 const fract=value=>value-Math.floor(value);
 const grid=(nx,ny)=>{
  const key=nx+':'+ny;if(grids.has(key))return grids.get(key);
  const values=new Float32Array(nx*ny);
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)values[y*nx+x]=fract(Math.sin(x*127.1+y*311.7+91)*43758.5453);
  grids.set(key,values);return values;
 };
 const noise=(u,v,fx,fy=fx)=>{
  const nx=Math.max(1,Math.round(fx*period)),ny=Math.max(1,Math.round(fy*period)),values=grid(nx,ny),px=u*nx,py=v*ny,ix=Math.floor(px),iy=Math.floor(py);let a=px-ix,b=py-iy;a=a*a*(3-2*a);b=b*b*(3-2*b);
  const x=ix%nx,y=iy%ny,nextX=(x+1)%nx,nextY=(y+1)%ny;
  return (values[y*nx+x]*(1-a)+values[y*nx+nextX]*a)*(1-b)+(values[nextY*nx+x]*(1-a)+values[nextY*nx+nextX]*a)*b;
 };
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,i=(y*size+x)*4;let a,b,c;
  if(kind==='ground'){a=noise(u,v,.65)*.65+noise(u,v,2.8)*.35;b=noise(u,v,4.5);c=noise(u,v,24);}
  else if(kind==='bark'){a=noise(u,v,2.1);b=noise(u,v,3,1);c=noise(u,v,12,2);}
  else if(kind==='rock'){a=noise(u,v,2.1);b=noise(u,v,.7,8);c=noise(u,v,22);}
  else{a=noise(u,v,2.1);b=noise(u,v,5);c=noise(u,v,17);}
  data[i]=Math.round(a*255);data[i+1]=Math.round(b*255);data[i+2]=Math.round(c*255);data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;cache.set(kind,texture);return texture;
}

export async function loadDetailAtlases(){
 await Promise.all(['ground','foliage','bark','rock'].map(async kind=>{
  if(cache.has(kind))return;
  const response=await fetch(`./assets/detail/${kind}.rgba`);
  if(!response.ok)throw new Error(`Missing packed detail texture: ${kind}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length!==256*256*4)throw new Error(`Invalid packed detail texture: ${kind}`);
  const texture=new THREE.DataTexture(bytes,256,256);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;cache.set(kind,texture);
 }));
}
