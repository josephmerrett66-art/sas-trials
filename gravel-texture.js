import * as THREE from './vendor/three.module.js';

let cached;
// A two-metre tile of irregular packed stones. Generated once; one filtered
// texture lookup replaces the trail's old noise lookup, with no new geometry.
export function gravelTexture(){
  if(cached)return cached;
  const size=512,cells=72,data=new Uint8Array(size*size*4);
  const hash=(x,y,s)=>{x=(x+cells)%cells;y=(y+cells)%cells;const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n);};
  const stones=Array.from({length:cells*cells},(_,i)=>{const x=i%cells,y=Math.floor(i/cells);return [.02+hash(x,y,1)*.96,.02+hash(x,y,2)*.96,.65+hash(x,y,3)*.8,.8+hash(x,y,4)*.3];});
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const px=x*cells/size,py=y*cells/size,cx=Math.floor(px),cy=Math.floor(py);
    let first=Infinity,second=Infinity,dx=0,dy=0,tone=1;
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
      const sx=cx+ox,sy=cy+oy,s=stones[((sy+cells)%cells)*cells+(sx+cells)%cells];
      const vx=px-sx-s[0],vy=py-sy-s[1],d=vx*vx*s[2]+vy*vy/s[2];
      if(d<first){second=first;first=d;dx=vx;dy=vy;tone=s[3];}else if(d<second)second=d;
    }
    const edge=Math.min(1,Math.max(0,(Math.sqrt(second)-Math.sqrt(first))/.06));
    const relief=(dy-dx)*.1,grain=(hash(x%cells,y%cells,5)-.5)*.065;
    const shade=.66+(tone+relief-.66)*edge+grain;
    const offset=(y*size+x)*4;
    data[offset]=Math.round(Math.min(1,shade/1.3)*255);data[offset+1]=data[offset];data[offset+2]=data[offset];data[offset+3]=255;
  }
  cached=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  cached.wrapS=cached.wrapT=THREE.RepeatWrapping;
  cached.magFilter=THREE.LinearFilter;cached.minFilter=THREE.LinearMipmapLinearFilter;
  cached.generateMipmaps=true;cached.needsUpdate=true;cached.name='Packed tan gravel relief';
  return cached;
}
