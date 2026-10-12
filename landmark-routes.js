import {S,WORLD_SIZE,WORLD_SCALE} from './world-size.js?v=big-1';
// Static, metre-sampled route fields: constant-cost queries for terrain and planting.
// Smooth unequal bends give each trail its own recognisable geography.
function route(name,points,width,level=null){
 const start=points[0][0],end=points.at(-1)[0],xs=new Float32Array((end-start)*2+1);
 let k=0;
 for(let i=0;i<xs.length;i++){
  const z=start+i*.5;while(k<points.length-2&&z>points[k+1][0])k++;
  const a=points[k],b=points[k+1],prev=points[Math.max(0,k-1)],next=points[Math.min(points.length-1,k+2)],h=b[0]-a[0],t=(z-a[0])/h;
  const m0=(b[1]-prev[1])/(b[0]-prev[0]),m1=(next[1]-a[1])/(next[0]-a[0]);
  xs[i]=(2*t*t*t-3*t*t+1)*a[1]+(t*t*t-2*t*t+t)*h*m0+(-2*t*t*t+3*t*t)*b[1]+(t*t*t-t*t)*h*m1;
 }
 const center=z=>{const f=Math.max(0,Math.min(xs.length-1,(z-start)*2)),i=Math.min(xs.length-2,Math.floor(f));return xs[i]+(xs[i+1]-xs[i])*(f-i);};
 const slope=z=>(center(z+1)-center(z-1))*.5;
 return {name,start,end,center,slope,width,level,distance:(x,z)=>z<start||z>end?Infinity:Math.abs(x-center(z))/Math.sqrt(1+slope(z)**2)};
}
// Laid out on the old 1440 m map and scaled up with it.
const scaled=points=>points.map(([z,x])=>[Math.round(S(z)),S(x)]);
const trailGuide=route('Trail guide', scaled([[-720,-90],[-580,-145],[-400,-50],[-250,170],[-100,145],[0,85],[135,175],[280,125],[440,-60],[560,-95],[720,40]]),z=>6.5+1.2*Math.sin(z/73)+.6*Math.sin(z/29));
// Preserve the existing trails; this guide no longer controls terrain or water.
const bankPoints=[];for(let z=-WORLD_SIZE/2;z<=WORLD_SIZE/2;z+=30)bankPoints.push([z,trailGuide.center(z)-S(25)-S(60)*Math.exp(-((z/WORLD_SCALE)**2)/9000)+S(7)*Math.sin(z/S(108))]);
export const mainTrail=route('Valley trail',bankPoints,z=>2.15+.3*Math.sin(z/97));
export const trails=[mainTrail,
 route('Ridge trail',[[Math.round(S(-360)),mainTrail.center(Math.round(S(-360)))],...scaled([[-210,-110],[-45,-230],[140,-360],[340,-450],[530,-570],[720,-625]])],z=>1.65+.2*Math.sin(z/61)),
 route('East trail',[[Math.round(S(240)),mainTrail.center(Math.round(S(240)))],...scaled([[335,230],[450,350],[570,440],[720,590]])],z=>1.65+.2*Math.sin(z/71))];
export function trailClearance(x,z){let d=Infinity;for(const r of trails)d=Math.min(d,r.distance(x,z)-r.width(z));return d;}
export const trailCenter=z=>mainTrail.center(z);
