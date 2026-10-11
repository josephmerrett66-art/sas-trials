import {terrainHeight,WORLD_SIZE,TERRAIN_STEP} from './terrain.js?v=gullies-1';
// Drainage is computed once from the untouched rendered terrain. No excavation,
// embankments, depression filling, or imposed global water height.
const step=TERRAIN_STEP,n=WORLD_SIZE/step+1,half=WORLD_SIZE/2,count=n*n;
const heights=new Float32Array(count),next=new Int32Array(count).fill(-1),area=new Uint32Array(count).fill(1);
const position=i=>({x:(i%n)*step-half,z:Math.floor(i/n)*step-half});
for(let i=0;i<count;i++){const p=position(i);heights[i]=terrainHeight(p.x,p.z);}
for(let i=0;i<count;i++){const ix=i%n,iz=Math.floor(i/n);let slope=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz||ix+dx<0||ix+dx>=n||iz+dz<0||iz+dz>=n)continue;const j=i+dz*n+dx,s=(heights[i]-heights[j])/(step*Math.hypot(dx,dz));if(s>slope+.000001){slope=s;next[i]=j;}}}
const order=Array.from({length:count},(_,i)=>i).sort((a,b)=>heights[b]-heights[a]);for(const i of order)if(next[i]>=0)area[next[i]]+=area[i];
const upstream=new Uint8Array(count);for(let i=0;i<count;i++)if(area[i]>=110&&next[i]>=0)upstream[next[i]]=1;
const candidates=[];
for(let i=0;i<count;i++)if(area[i]>=110&&!upstream[i]){const ids=[];let j=i;while(j>=0){ids.push(j);j=next[j];}if(ids.length>=12)candidates.push(ids);}
candidates.sort((a,b)=>b.length-a.length);
const used=new Set();export const rivers=[];
for(const ids of candidates){if(rivers.length>=14)break;const points=[];let length=0;
 for(const id of ids){const p=position(id),previous=points.at(-1);if(previous)length+=Math.hypot(p.x-previous.x,p.z-previous.z);points.push({...p,y:heights[id],s:length,width:Math.min(5,1.4+Math.sqrt(area[id])*.055),catchment:area[id]});if(used.has(id))break;used.add(id);}
 if(points.length<8)continue;rivers.push({name:`Gully stream ${rivers.length+1}`,points,length});
}
// Bucket segment lookup, reused by initial terrain tint, planting and checkpoint placement.
const buckets=new Map(),cell=32,segments=[];
for(const r of rivers)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],segment={a,b,dx:b.x-a.x,dz:b.z-a.z,len2:(b.x-a.x)**2+(b.z-a.z)**2,width:Math.max(a.width,b.width)};segments.push(segment);
 for(let z=Math.floor((Math.min(a.z,b.z)-8)/cell);z<=Math.floor((Math.max(a.z,b.z)+8)/cell);z++)for(let x=Math.floor((Math.min(a.x,b.x)-8)/cell);x<=Math.floor((Math.max(a.x,b.x)+8)/cell);x++){const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(segment);}}
export function riverClearance(x,z){let d=Infinity;const list=buckets.get(Math.floor(x/cell)+','+Math.floor(z/cell));if(!list)return d;for(const s of list){const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.len2));d=Math.min(d,Math.hypot(x-s.a.x-t*s.dx,z-s.a.z-t*s.dz)-s.width);}return d;}
// A reproducible bank inspection location on a long, well-fed gully.
const inspect=rivers.find(r=>r.points.every(p=>Math.abs(p.x)<620&&Math.abs(p.z)<620))??rivers[0],mid=Math.floor(inspect.points.length*.55),p=inspect.points[mid],q=inspect.points[mid+1]??inspect.points[mid-1],dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz);
export const riverInspection={x:p.x-dz/len*6,z:p.z+dx/len*6,yaw:Math.atan2(-dx,-dz)};
export const drainageStats={streams:rivers.length,segments:segments.length,totalLength:rivers.reduce((v,r)=>v+r.length,0)};
