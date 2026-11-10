// Stippled gradient: round dots whose density follows a gradient.
// Dots sit on a jittered grid and are switched on with an ordered (Bayer 4x4) threshold,
// so the density reads as an even tone instead of random clumps.
// Draws once at device pixel ratio; call again on resize or theme change.
function stipple(canvas,{color='#FF5B24',dot=1.1,gap=4,angle=135,from=0,to=1,jitter=.35,seed=7}={}){
  const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;
  canvas.width=w*dpr;canvas.height=h*dpr;const c=canvas.getContext('2d');c.scale(dpr,dpr);c.fillStyle=color;
  const B=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  let s=seed;const r=()=>(s=(s*16807)%2147483647)/2147483647;
  const a=angle*Math.PI/180,dx=Math.sin(a),dy=-Math.cos(a),len=Math.abs(w*dx)+Math.abs(h*dy);
  for(let j=0,y=0;y<h+gap;y+=gap,j++)for(let i=0,x=0;x<w+gap;x+=gap,i++){
    let t=((x-w/2)*dx+(y-h/2)*dy)/len+.5;t=from+(to-from)*Math.min(1,Math.max(0,t));
    const th=(B[(j%4)*4+(i%4)]+r())/17;
    if(t>th){c.beginPath();c.arc(x+(r()-.5)*gap*jitter,y+(r()-.5)*gap*jitter,dot,0,7);c.fill();}
  }
}
