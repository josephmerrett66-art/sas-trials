export class FrameMonitor {
 constructor(){this.frames=[];this.last=0;this.maxSamples=600;}
 sample(now,cpu,info,phases={}){
  if(this.last&&now-this.last<250)this.frames.push({ms:now-this.last,cpu,calls:info.calls,triangles:info.triangles,...phases});
  this.last=now;if(this.frames.length>this.maxSamples)this.frames.shift();
 }
 summary(){
  const frames=this.frames.slice(30);if(!frames.length)return {samples:0};
  const sorted=frames.map(f=>f.ms).sort((a,b)=>a-b),average=key=>frames.reduce((sum,f)=>sum+f[key],0)/frames.length;
  return {samples:frames.length,fps:+(1000/average('ms')).toFixed(1),frameMs:+average('ms').toFixed(2),p95Ms:+sorted[Math.floor(sorted.length*.95)].toFixed(2),cpuMs:+average('cpu').toFixed(2),drawCalls:Math.round(average('calls')),triangles:Math.round(average('triangles')),physicsMs:+average('physicsMs').toFixed(2)||0,updateMs:+average('updateMs').toFixed(2)||0,cullMs:+average('cullMs').toFixed(2)||0,renderMs:+average('renderMs').toFixed(2)||0};
 }
}
