// Static reference-style compass artwork, generated once and reused by the held rig.
export function baseplateArtwork(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=704;const c=canvas.getContext('2d');
 c.fillStyle='rgba(204,223,232,.25)';c.strokeStyle='#b8d0da';c.lineWidth=7;
 c.beginPath();c.moveTo(46,8);c.lineTo(466,8);c.quadraticCurveTo(503,8,503,48);c.lineTo(503,656);c.quadraticCurveTo(503,695,466,695);c.lineTo(46,695);c.quadraticCurveTo(9,695,9,656);c.lineTo(9,48);c.quadraticCurveTo(9,8,46,8);c.closePath();c.fill();c.stroke();
 // Map rulers etched along the clear baseplate; a fixed direction-of-travel arrow.
 c.strokeStyle='#47778d';c.fillStyle='#47778d';c.lineWidth=2;c.font='14px monospace';
 for(let i=0;i<=60;i++){const y=35+i*10;c.beginPath();c.moveTo(18,y);c.lineTo(i%5===0?42:30,y);c.moveTo(494,y);c.lineTo(i%5===0?470:482,y);c.stroke();if(i%10===0)c.fillText(String(i),48,y+5);}
 for(let i=0;i<=40;i++){const x=56+i*10;c.beginPath();c.moveTo(x,680);c.lineTo(x,i%5===0?657:667);c.stroke();}
 c.fillStyle='#d6322a';c.beginPath();c.moveTo(256,26);c.lineTo(230,69);c.lineTo(249,63);c.lineTo(249,143);c.lineTo(263,143);c.lineTo(263,63);c.lineTo(282,69);c.closePath();c.fill();
 // Bezel around the capsule, painted into the existing baseplate draw.
 const centre=414;c.save();c.translate(256,centre);c.scale(512/.29,704/.40);c.fillStyle='#9caeb5';c.beginPath();c.arc(0,0,.113,0,Math.PI*2);c.fill();c.fillStyle='#22282d';c.beginPath();c.arc(0,0,.106,0,Math.PI*2);c.fill();c.restore();
 c.strokeStyle='rgba(238,249,255,.8)';c.lineWidth=3;c.strokeRect(59,612,145,35);c.strokeRect(308,612,145,35);
 return canvas;
}
export function dialArtwork(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const c=canvas.getContext('2d');c.translate(256,256);
 c.fillStyle='#20272d';c.beginPath();c.arc(0,0,256,0,Math.PI*2);c.fill();c.fillStyle='#b6c2b9';c.beginPath();c.arc(0,0,174,0,Math.PI*2);c.fill();
 c.save();c.beginPath();c.arc(0,0,168,0,Math.PI*2);c.clip();c.strokeStyle='#b8453e';c.lineWidth=2;
 for(const x of [-104,-52,0,52,104]){c.beginPath();c.moveTo(x,-160);c.lineTo(x,160);c.stroke();}c.restore();
 c.strokeStyle='#f2f2e7';c.fillStyle='#f2f2e7';c.lineWidth=2;c.textAlign='center';c.textBaseline='middle';
 for(let i=0;i<72;i++){c.save();c.rotate(i*Math.PI/36);c.beginPath();c.moveTo(0,-248);c.lineTo(0,i%18===0?-229:i%6===0?-230:-239);c.stroke();if(i%6===0&&i%18!==0){c.font='15px monospace';c.fillText(String(i*5),0,-218);}c.restore();}
 c.font='bold 42px monospace';for(const [t,x,y] of [['N',0,-191],['E',191,0],['S',0,191],['W',-191,0]])c.fillText(t,x,y);
 return canvas;
}
