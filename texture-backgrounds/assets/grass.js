// Grass: thousands of short tapered blades, drawn once into a seamless tile
// and returned as a data URL to use as a repeating background.
// base = fill color, light/dark = blade tones. Pure canvas, no dependencies.
function grassTile({size=256,base='#2A5D78',light='#5BC8FF',dark='#0E0D0B',density=1.1,seed=5}={}){
  const cv=document.createElement('canvas');cv.width=cv.height=size;const c=cv.getContext('2d');
  let s=seed;const r=()=>(s=(s*16807)%2147483647)/2147483647;
  c.fillStyle=base;c.fillRect(0,0,size,size);
  const n=Math.round(size*size/22*density);
  for(let k=0;k<n;k++){
    const x=r()*size,y=r()*size,L=10+r()*14,a=-Math.PI/2+(r()-.5)*.7,w=.35+r()*.55,bend=(r()-.5)*6;
    const tone=r();c.globalAlpha=.12+r()*.3;c.fillStyle=tone<.5?dark:light;
    const tx=Math.cos(a)*L,ty=Math.sin(a)*L,px=-Math.sin(a)*w,py=Math.cos(a)*w;
    for(const ox of[-size,0,size])for(const oy of[-size,0,size]){ // wrap so the tile is seamless
      const X=x+ox,Y=y+oy;if(X<-25||X>size+25||Y<-25||Y>size+25)continue;
      c.beginPath();c.moveTo(X-px,Y-py);c.quadraticCurveTo(X+tx/2+bend,Y+ty/2,X+tx,Y+ty);
      c.quadraticCurveTo(X+tx/2+bend,Y+ty/2,X+px,Y+py);c.closePath();c.fill();}
  }
  c.globalAlpha=1;return cv.toDataURL('image/png');
}
