export class GpuTimer {
 constructor(gl){this.gl=gl;this.extension=gl.getExtension('EXT_disjoint_timer_query_webgl2');this.pending=[];this.current=null;this.ms=null;this.frame=0;}
 begin(){
  const gl=this.gl,ext=this.extension;if(!ext||++this.frame%60!==0)return;
  if(gl.getParameter(ext.GPU_DISJOINT_EXT)){this.ms=null;for(const query of this.pending)gl.deleteQuery(query);this.pending=[];}
  while(this.pending.length&&gl.getQueryParameter(this.pending[0],gl.QUERY_RESULT_AVAILABLE)){
   const query=this.pending.shift();this.ms=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;gl.deleteQuery(query);
  }
  if(this.pending.length>=4)return;
  this.current=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,this.current);
 }
 end(){if(!this.current)return;this.gl.endQuery(this.extension.TIME_ELAPSED_EXT);this.pending.push(this.current);this.current=null;}
}
