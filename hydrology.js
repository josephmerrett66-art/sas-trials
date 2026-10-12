// River network: where water would naturally run across this terrain, then the gentle
// re-shaping of the ground (channels, floodplains, cut saddles) that lets it run there.
// Computed once at load from the original height grid; deterministic.
import {FIRST_CONTROL} from './first-control.js?v=big-1';
import {SECOND_CONTROL} from './second-control.js?v=big-1';
import {CONTROL_LANDMARKS} from './control-landmarks.js?v=big-1';

// The river enters from the north-east edge and leaves at the lowest point of the west edge.
import {S} from './world-size.js?v=big-1';
// Two river systems: the big river crossing to the south-west corner, and a second
// draining the eastern hills to the south edge.
const MAINS=[{inlet:{x:S(720),z:S(-420)},outlet:{x:S(-720),z:S(635)}},{inlet:{x:S(560),z:S(-720)},outlet:{x:S(330),z:S(720)}}],START={x:0,z:12};
const SOURCE_THRESHOLD=450; // catchment cells (25 m² each) before a branch is a stream
const MIN_BRANCH=260,MAX_BRANCHES=16;

const hash=(x,z)=>{let k=Math.imul(x|0,374761393)+Math.imul(z|0,668265263);k=Math.imul(k^(k>>>13),1274126177);return ((k^(k>>>16))>>>0)/4294967296;};
const vnoise=(x,z)=>{const X=Math.floor(x),Z=Math.floor(z),fx=x-X,fz=z-Z,sx=fx*fx*(3-2*fx),sz=fz*fz*(3-2*fz),a=hash(X,Z),b=hash(X+1,Z),c=hash(X,Z+1),d=hash(X+1,Z+1);return a+(b-a)*sx+(c-a)*sz+(a-b-c+d)*sx*sz;};
const fbm=(x,z)=>vnoise(x/170,z/170)*.55+vnoise(x/85+9,z/85+3)*.3+vnoise(x/40+5,z/40+7)*.15;
const noise1=s=>vnoise(s,17.3);
const smoothstep=t=>t<=0?0:t>=1?1:t*t*(3-2*t);

class MinHeap{constructor(){this.k=[];this.v=[];}get size(){return this.k.length;}
 push(key,val){const k=this.k,v=this.v;let i=k.length;k.push(key);v.push(val);while(i>0){const p=(i-1)>>1;if(k[p]<=key)break;k[i]=k[p];v[i]=v[p];i=p;}k[i]=key;v[i]=val;}
 pop(){const k=this.k,v=this.v,top=v[0],lk=k.pop(),lv=v.pop();if(k.length){let i=0;for(;;){const l=2*i+1,r=l+1;let m=-1,mk=lk;if(l<k.length&&k[l]<mk){m=l;mk=k[l];}if(r<k.length&&k[r]<mk){m=r;}if(m<0)break;k[i]=k[m];v[i]=v[m];i=m;}k[i]=lk;v[i]=lv;}return top;}}

function sampler(h,n,step,half){
 return (x,z)=>{const N=n-1,gx=Math.max(0,Math.min(N-1e-6,(x+half)/step)),gz=Math.max(0,Math.min(N-1e-6,(z+half)/step)),ix=Math.floor(gx),iz=Math.floor(gz),tx=gx-ix,tz=gz-iz,a=h[iz*n+ix],b=h[(iz+1)*n+ix],d=h[iz*n+ix+1],c=h[(iz+1)*n+ix+1];return tx+tz<=1?a+tx*(d-a)+tz*(b-a):c+(1-tx)*(b-c)+(1-tz)*(d-c);};
}
// Pool-adjacent-violators: the closest non-increasing sequence (balances cutting and filling).
function nonIncreasing(values){
 const blocks=[];for(const v of values){blocks.push({sum:v,count:1});while(blocks.length>1){const b=blocks.at(-1),a=blocks.at(-2);if(a.sum/a.count>=b.sum/b.count)break;a.sum+=b.sum;a.count+=b.count;blocks.pop();}}
 const out=[];for(const b of blocks)for(let i=0;i<b.count;i++)out.push(b.sum/b.count);return out;
}
function resample(points,spacing){
 const out=[points[0]];let carry=0;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b.x-a.x,b.z-a.z);let t=spacing-carry;while(t<=len){out.push({x:a.x+(b.x-a.x)*t/len,z:a.z+(b.z-a.z)*t/len});t+=spacing;}carry=len-(t-spacing);}
 const last=points.at(-1),end=out.at(-1);if(Math.hypot(last.x-end.x,last.z-end.z)>spacing*.3)out.push({x:last.x,z:last.z});else out[out.length-1]={x:last.x,z:last.z};return out;
}
function smooth(points,radius,passes){
 let p=points;for(let k=0;k<passes;k++){const q=p.map((pt,i)=>{if(i===0||i===p.length-1)return pt;let x=0,z=0,w=0;for(let j=-radius;j<=radius;j++){const o=p[Math.max(0,Math.min(p.length-1,i+j))],g=radius+1-Math.abs(j);x+=o.x*g;z+=o.z*g;w+=g;}return {x:x/w,z:z/w};});p=q;}return p;
}
const arc=points=>{let s=0;return points.map((p,i)=>{if(i)s+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);return s;});};

// Sine-generated (Kinoshita) bends: the channel's heading swings sinusoidally with distance,
// giving rounded, slightly skewed loops like real meanders. Each bend picks its own size
// and length; bends relax on steeper ground and fade out at both ends of the channel.
function meander(valley,halfWidth,seed,main,height){
 const s=arc(valley),L=s.at(-1),width=2*halfWidth,ys=new Float64Array(valley.length);
 const grade=k=>{const a=valley[Math.max(0,k-8)],b=valley[Math.min(valley.length-1,k+8)];return Math.abs(height(a.x,a.z)-height(b.x,b.z))/Math.max(1,s[Math.min(valley.length-1,k+8)]-s[Math.max(0,k-8)]);};
 let wave=0,phi=0,u=0,y=0,k=0;const pick=w=>({theta:(main?.6:.5)+(main?.55:.45)*noise1(w*1.37+seed),lambda:width*(main?10.5:11)*(.8+.55*noise1(w*2.11+seed+7)),skew:(noise1(w*3.3+seed+11)-.5)*2});
 let bend=pick(0);const samples=[[0,0]];
 while(u<L){const ki=Math.min(valley.length-1,Math.round(u/2)),taper=smoothstep(u/(bend.lambda*.8))*smoothstep((L-u)/(bend.lambda*.8)),t0=bend.theta*taper*Math.max(.35,Math.min(1,1-(grade(ki)-.02)*12));
  const theta=t0*Math.sin(phi)+t0**3*(bend.skew/32*Math.cos(3*phi)-Math.sin(3*phi)/192);
  u+=Math.cos(theta);y+=Math.sin(theta);phi+=2*Math.PI/bend.lambda;if(phi>=2*Math.PI){phi-=2*Math.PI;wave++;bend=pick(wave);}samples.push([u,y]);}
 // Remove residual drift so the channel still starts and ends on the valley line.
 const endY=samples.at(-1)[1];let j=0;
 for(k=0;k<valley.length;k++){while(j<samples.length-2&&samples[j+1][0]<s[k])j++;const [u0,y0]=samples[j],[u1,y1]=samples[j+1],f=Math.max(0,Math.min(1,(s[k]-u0)/((u1-u0)||1)));ys[k]=y0+(y1-y0)*f-endY*s[k]/L;}
 // Bends stay on the valley floor: shrink any swing that would climb the valley side.
 const normals=valley.map((p,i)=>{const a=valley[Math.max(0,i-1)],b=valley[Math.min(valley.length-1,i+1)],tx=b.x-a.x,tz=b.z-a.z,len=Math.hypot(tx,tz)||1;return [-tz/len,tx/len];});
 const scale=valley.map((p,i)=>{let f=1;for(let pass=0;pass<6;pass++){const q=ys[i]*f,rise=height(p.x+normals[i][0]*q,p.z+normals[i][1]*q)-height(p.x,p.z);if(rise<2.5)break;f*=.75;}return f;});
 const eased=scale.map((_,i)=>{let m=1;for(let j=-20;j<=20;j++)m=Math.min(m,scale[Math.max(0,Math.min(scale.length-1,i+j))]);return m;});
 const soft=eased.map((_,i)=>{let sum=0,c=0;for(let j=-20;j<=20;j++){sum+=eased[Math.max(0,Math.min(eased.length-1,i+j))];c++;}return sum/c;});
 return valley.map((p,i)=>({x:p.x+normals[i][0]*ys[i]*soft[i],z:p.z+normals[i][1]*ys[i]*soft[i]}));
}

export function buildRiverNetwork(base,n,step,half){
 const N=n*n,height=sampler(base,n,step,half);let hmin=Infinity,hmax=-Infinity;for(const v of base){if(v<hmin)hmin=v;if(v>hmax)hmax=v;}
 const cell=(x,z)=>Math.round((z+half)/step)*n+Math.round((x+half)/step);
 // Keep water away from the start clearing and every checkpoint site.
 const avoid=[{...START,r:130},{...FIRST_CONTROL.post,r:60},{...SECOND_CONTROL.car,r:60},...CONTROL_LANDMARKS.flatMap(c=>[{...c.post,r:60},{...c.feature,r:60}])];
 const penalty=new Float32Array(N),noise=new Float32Array(N);
 for(let i=0;i<N;i++){const x=(i%n)*step-half,z=Math.floor(i/n)*step-half;noise[i]=fbm(x,z);let p=0;for(const a of avoid){const d=Math.hypot(x-a.x,z-a.z);if(d<a.r)p=Math.max(p,1-d/a.r);}penalty[i]=p;}
 // Least-cost routing from the outlet: cheap on low ground, costly uphill or near sites.
 // A little broad noise lets channels choose their own line along flat valley floors.
 const neighbours=[];for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){if(!dx&&!dz)continue;if((Math.abs(dx)===2||Math.abs(dz)===2)&&(Math.abs(dx)+Math.abs(dz))%2===0)continue;neighbours.push([dx,dz,Math.hypot(dx,dz)*step]);}
 const dist=new Float64Array(N).fill(Infinity),receiver=new Int32Array(N).fill(-1),done=new Uint8Array(N),order=[],heap=new MinHeap(),outlets=MAINS.map(m=>cell(m.outlet.x,m.outlet.z));
 for(const outlet of outlets){dist[outlet]=0;heap.push(0,outlet);}
 while(heap.size){const i=heap.pop();if(done[i])continue;done[i]=1;order.push(i);const x=i%n,z=(i-x)/n;
  for(const [dx,dz,len] of neighbours){const X=x+dx,Z=z+dz;if(X<0||Z<0||X>=n||Z>=n)continue;const j=Z*n+X;if(done[j])continue;
   const t=Math.max(0,(base[j]-hmin)/(hmax-hmin)+.35*(noise[j]-.5)),c=len*(1+8*t*t)*(1+25*penalty[j])+25*Math.max(0,base[i]-base[j]);
   if(dist[i]+c<dist[j]){dist[j]=dist[i]+c;receiver[j]=i;heap.push(dist[j],j);}}}
 const area=new Float64Array(N).fill(1);for(let k=order.length-1;k>=0;k--){const i=order[k];if(receiver[i]>=0)area[receiver[i]]+=area[i];}
 const onMain=new Uint8Array(N);for(const m of MAINS)for(let i=cell(m.inlet.x,m.inlet.z);i>=0;i=receiver[i])onMain[i]=1;
 const donors=Array.from({length:N},()=>[]);for(let i=0;i<N;i++)if(receiver[i]>=0)donors[receiver[i]].push(i);
 const channel=i=>onMain[i]||area[i]>=SOURCE_THRESHOLD;
 const point=i=>({x:(i%n)*step-half,z:Math.floor(i/n)*step-half});
 // Trace upstream: each junction continues along its largest donor; the rest become branches.
 const raw=[];const trace=(start,parent,main)=>{
  const cells=[start];let cur=start;const forks=[];
  for(;;){const up=donors[cur].filter(channel);if(!up.length)break;
   let next=main?up.find(j=>onMain[j])??null:null;next??=up.reduce((a,b)=>area[b]>area[a]?b:a);
   for(const j of up)if(j!==next)forks.push({at:cur,start:j});cells.push(next);cur=next;}
  const length=(cells.length-1)*step*1.15;if(!main&&length<MIN_BRANCH)return;
  const entry={cells:cells.reverse(),parent,main,mouthArea:area[start]};raw.push(entry);
  for(const f of forks.sort((a,b)=>area[b.start]-area[a.start]))trace(f.start,{river:entry,cell:f.at},false);
 };
 for(const outlet of outlets)trace(outlet,null,true);
 const mains=raw.filter(r=>r.main),kept=[...mains,...raw.filter(r=>!r.main).sort((a,b)=>b.mouthArea-a.mouthArea).slice(0,MAX_BRANCHES)].filter(r=>!r.parent||raw.includes(r.parent.river));
 // Keep only branches whose parents survived the cut, main first, parents before children.
 const rivers=[];const ready=new Set();let pending=kept.slice();
 while(pending.length){const next=pending.find(r=>!r.parent||ready.has(r.parent.river));if(!next)break;pending=pending.filter(r=>r!==next);if(next.parent&&!kept.includes(next.parent.river))continue;ready.add(next);rivers.push(next);}
 // Place rivers biggest first. A branch joins the network where it first comes within
 // reach of water already placed, so streams meet rivers instead of running alongside them.
 const out=[],occupied=new Map(),key=(x,z)=>Math.floor(x/20)*65536+Math.floor(z/20);
 const occupy=river=>{for(const p of river.points){const k=key(p.x,p.z);let list=occupied.get(k);if(!list)occupied.set(k,list=[]);list.push(p);}};
 const nearestPlaced=(x,z,r)=>{let best=null,bd=r;for(let a=-Math.ceil(r/20);a<=Math.ceil(r/20);a++)for(let b=-Math.ceil(r/20);b<=Math.ceil(r/20);b++){const list=occupied.get(key(x+a*20,z+b*20));if(list)for(const p of list){const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;best=p;}}}return best;};
 const order2=[...rivers.filter(r=>r.main),...rivers.filter(r=>!r.main).sort((a,b)=>b.mouthArea-a.mouthArea)];
 for(const [index,r] of order2.entries()){
  let pts=r.cells.map(point),mouth=null;
  if(!r.main){
   for(let k=0;k<pts.length;k++){const m=nearestPlaced(pts[k].x,pts[k].z,k===pts.length-1?120:28);if(m){mouth=m;pts=pts.slice(0,k);break;}}
   if(!mouth)continue;pts.push({x:mouth.x,z:mouth.z});
   // Streams rise in valleys: drop any upstream reach that would need a deep cut through a ridge.
   for(;;){let low=Infinity,cut=-1;for(let k=0;k<pts.length;k++){const g=height(pts[k].x,pts[k].z);low=Math.min(low,g);if(g-low>13)cut=k;}if(cut<0)break;pts=pts.slice(cut);if(pts.length<3)break;}
   if(arc(pts).at(-1)<MIN_BRANCH)continue;
  }
  const halfWidth=r.main?5.6:Math.min(4.4,3.6+.0007*r.mouthArea),seed=index*31.7+3;
  const valley=smooth(resample(pts,5),6,4);
  pts=meander(resample(valley,2),halfWidth,seed,r.main,height);
  pts=smooth(resample(pts,3),1,2);if(mouth)pts[pts.length-1]={x:mouth.x,z:mouth.z};
  const s=arc(pts),length=s.at(-1);
  // Water level: just below the original ground, never rising downstream. Where the
  // ground rises ahead the channel cuts through (a water gap) instead of ponding.
  // A little alluvial fill is allowed (the floodplain rises over a hollow), which halves
  // how deep the river must cut where it crosses from one valley into the next.
  // The level sits below the lowest ground across the whole floodplain, not just the
  // centreline, so a river on a valley side never stands above the slope beside it.
  const ground=pts.map((p,i)=>{const a=pts[Math.max(0,i-2)],b=pts[Math.min(pts.length-1,i+2)],l=Math.hypot(b.x-a.x,b.z-a.z)||1,nx=-(b.z-a.z)/l,nz=(b.x-a.x)/l;let low=height(p.x,p.z);for(const o of [6,12,18,24])for(const side of [-1,1])low=Math.min(low,height(p.x+nx*o*side,p.z+nz*o*side));return low-.35;}),fillLimit=0;
  let level=[];for(let i=0;i<pts.length;i++)level.push(i?Math.min(level[i-1],ground[i]+fillLimit):ground[i]);
  const balanced=nonIncreasing(ground);level=level.map((v,i)=>Math.min(v,Math.max(balanced[i],ground[i]-.0)));
  const windowed=v=>v.map((_,i)=>{let sum=0,c=0;for(let j=-10;j<=10;j++){sum+=v[Math.max(0,Math.min(v.length-1,i+j))];c++;}return sum/c;});
  level=windowed(level);
  // Streams settle to the receiving water level before entering its floodplain.
  if(mouth){const reach=mouth.F+14;level=level.map((v,i)=>Math.max(mouth.S,Math.min(v,mouth.S+.03*Math.max(0,length-s[i]-reach))));}
  const points=pts.map((p,i)=>{const t=s[i]/length,w=r.main?4.6+2.4*t:halfWidth;return {x:p.x,z:p.z,s:s[i],S:level[i],w,D:r.main?1.05:.6,F:w+8+6*noise1(s[i]/110+seed+90)};});
  if(mouth)points[points.length-1].S=mouth.S;
  const river={name:r.main?(out.length?'River 2':'River'):`Stream ${out.length}`,main:r.main,points,length};out.push(river);occupy(river);
 }
 return out;
}

// Spatial index over every river segment for nearest-water queries.
export function riverIndex(rivers,cellSize=24,extra=2){
 const buckets=new Map(),segments=[];
 for(const r of rivers)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],seg={a,b,dx:b.x-a.x,dz:b.z-a.z,river:r};seg.len2=seg.dx*seg.dx+seg.dz*seg.dz||1;segments.push(seg);
  const reach=Math.max(a.F,b.F)+extra;for(let z=Math.floor((Math.min(a.z,b.z)-reach)/cellSize);z<=Math.floor((Math.max(a.z,b.z)+reach)/cellSize);z++)for(let x=Math.floor((Math.min(a.x,b.x)-reach)/cellSize);x<=Math.floor((Math.max(a.x,b.x)+reach)/cellSize);x++){const key=x*65536+z;let list=buckets.get(key);if(!list)buckets.set(key,list=[]);list.push(seg);}}
 const result={d:Infinity,S:0,w:0,D:0,F:0,river:null};
 // Nearest centreline within the local bucket; interpolated level, width and depth there.
 function nearest(x,z,out=result){out.d=Infinity;out.river=null;const list=buckets.get(Math.floor(x/cellSize)*65536+Math.floor(z/cellSize));if(!list)return out;
  for(const g of list){const t=Math.max(0,Math.min(1,((x-g.a.x)*g.dx+(z-g.a.z)*g.dz)/g.len2)),d=Math.hypot(x-g.a.x-t*g.dx,z-g.a.z-t*g.dz);if(d<out.d){out.d=d;out.river=g.river;out.S=g.a.S+(g.b.S-g.a.S)*t;out.w=g.a.w+(g.b.w-g.a.w)*t;out.D=g.a.D+(g.b.D-g.a.D)*t;out.F=g.a.F+(g.b.F-g.a.F)*t;}}
  return out;}
 function each(x,z,visit){const list=buckets.get(Math.floor(x/cellSize)*65536+Math.floor(z/cellSize));if(list)for(const g of list){const t=Math.max(0,Math.min(1,((x-g.a.x)*g.dx+(z-g.a.z)*g.dz)/g.len2));visit(g,t,Math.hypot(x-g.a.x-t*g.dx,z-g.a.z-t*g.dz));}}
 return {nearest,each,segments};
}

// Reshape the height grid in place: a channel below the water line, a gently rising
// floodplain beside it, then a smooth blend back to the untouched ground.
export function carveRivers(heights,n,step,half,rivers){
 const N=n*n,original=heights.slice();
 const design=(g,t,d,orig)=>{const S=g.a.S+(g.b.S-g.a.S)*t,w=g.a.w+(g.b.w-g.a.w)*t,D=g.a.D+(g.b.D-g.a.D)*t,F=g.a.F+(g.b.F-g.a.F)*t,bank=S+.15;
  if(d<w)return {inside:true,h:bank-(D+.15)*(1-(d/w)**2)};
  const edge=S+.45;if(d<F)return {inside:true,h:bank+.3*(d-w)/(F-w)};
  const R=Math.min(130,16+6*Math.abs(orig-edge)),u=(d-F)/R;if(u>=1)return null;return {inside:false,h:edge+(orig-edge)*smoothstep(u),u};};
 // The lowest floodplain wins where rivers meet; another river's outer blend never lowers
 // a floodplain, so banks stay above the water.
 // Between outer blends, the river whose bank is nearest shapes the ground.
 const inner=new Float32Array(N).fill(Infinity),outer=new Float32Array(N).fill(Infinity),outerU=new Float32Array(N).fill(Infinity);
 const bestD=new Float32Array(N),bestSeg=new Int32Array(N).fill(-1),bestT=new Float32Array(N),touched=[],claimed=new Uint8Array(N),claimedList=[];
 for(const river of rivers){
  // Each river is shaped by its nearest segment (continuous along the polyline): scan each
  // segment's reach once instead of testing every segment from every cell.
  // Two passes: the exact polyline near the channel, then every fourth point for the wide
  // outer blend, where a fraction of a metre makes no visible difference.
  const segments=points=>{const out=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z;out.push({a,b,dx,dz,len2:dx*dx+dz*dz||1});}return out;};
  const coarse=river.points.filter((p,i)=>i%4===0||i===river.points.length-1);
  for(const [segs,extra,near] of [[segments(river.points),3,true],[segments(coarse),130,false]]){
  touched.length=0;
  segs.forEach((g,k)=>{const reach=Math.max(g.a.F,g.b.F)+extra,x0=Math.max(0,Math.floor((Math.min(g.a.x,g.b.x)-reach+half)/step)),x1=Math.min(n-1,Math.ceil((Math.max(g.a.x,g.b.x)+reach+half)/step)),z0=Math.max(0,Math.floor((Math.min(g.a.z,g.b.z)-reach+half)/step)),z1=Math.min(n-1,Math.ceil((Math.max(g.a.z,g.b.z)+reach+half)/step));
   for(let iz=z0;iz<=z1;iz++)for(let ix=x0;ix<=x1;ix++){const i=iz*n+ix,x=ix*step-half,z=iz*step-half,t=Math.max(0,Math.min(1,((x-g.a.x)*g.dx+(z-g.a.z)*g.dz)/g.len2)),d=Math.hypot(x-g.a.x-t*g.dx,z-g.a.z-t*g.dz);
    if(d>reach)continue;if(bestSeg[i]===-1)touched.push(i);else if(d>=bestD[i])continue;bestD[i]=d;bestSeg[i]=k;bestT[i]=t;}});
  for(const i of touched){const g=segs[bestSeg[i]],F=g.a.F+(g.b.F-g.a.F)*bestT[i],keep=near||!claimed[i];
   if(near&&keep){claimed[i]=1;claimedList.push(i);}
   if(keep){const r=design(g,bestT[i],bestD[i],original[i]);if(r){if(r.inside)inner[i]=Math.min(inner[i],r.h);else if(r.u<outerU[i]){outer[i]=r.h;outerU[i]=r.u;}}}bestSeg[i]=-1;}
  }
  for(const i of claimedList)claimed[i]=0;claimedList.length=0;
 }
 for(let i=0;i<N;i++){let h=inner[i]<Infinity?inner[i]:outer[i];if(h===Infinity)continue;const x=(i%n)*step-half,z=Math.floor(i/n)*step-half,orig=original[i];
  // The start clearing keeps its exact ground; the reshaping fades out before it.
  const keep=smoothstep(Math.min(1,Math.max(0,(Math.hypot(x-START.x,z-START.z)-40)/50)));heights[i]=orig+(h-orig)*keep;}
 return riverIndex(rivers,48,150);
}
