// Adjust only rendering resolution; input and 120 Hz movement stay independent.
export class RenderBudget {
 constructor(renderer,maxScale=1){this.renderer=renderer;this.scale=maxScale;this.maxScale=maxScale;this.elapsed=0;this.frames=0;this.cpu=0;this.gpu=0;this.gpuSamples=0;this.cooldown=3;}
 resize(width,height,deviceScale=1){
  this.maxScale=Math.min(deviceScale,1,Math.sqrt(1200000/Math.max(1,width*height)));
  this.scale=Math.min(this.scale,this.maxScale);this.renderer.setPixelRatio(this.scale);
 }
 sample(frameMs,cpuMs,visible=true,gpuMs=null){
  if(!visible||frameMs>100){this.elapsed=this.frames=this.cpu=this.gpu=this.gpuSamples=0;return;}
  if(gpuMs!==null){this.gpu+=gpuMs;this.gpuSamples++;}
  this.elapsed+=frameMs/1000;this.frames++;this.cpu+=cpuMs;
  if(this.elapsed<2)return;
  const average=this.elapsed*1000/this.frames,cpu=this.cpu/this.frames,gpu=this.gpuSamples?this.gpu/this.gpuSamples:null;
  this.cooldown-=this.elapsed;this.elapsed=this.frames=this.cpu=this.gpu=this.gpuSamples=0;
  if(this.cooldown>0)return;
  let next=this.scale;
  if(average>17.2&&cpu<12&&gpu!==null&&gpu>7&&cpu+gpu>15)next=Math.max(Math.min(.6,this.maxScale),this.scale-.1);
  else if(average<17&&(gpu===null||gpu<10))next=Math.min(this.maxScale,this.scale+.05);
  if(Math.abs(next-this.scale)>.001){this.scale=Math.min(this.maxScale,+next.toFixed(2));this.renderer.setPixelRatio(this.scale);this.cooldown=4;}
 }
}
