/* Glass and light backgrounds: six effects, one tiny WebGL runtime, no dependencies.
 *   AfterstreamGlass.mount(canvas, 'thermal', { interactive, pointerTarget, fixedTime, maxDpr }) -> { destroy() }
 *   AfterstreamGlass.effects           -> ['fluted','lens','iridescent','thermal','ripples']
 *   AfterstreamGlass.source('thermal') -> full fragment shader text (for Remotion, three.js, etc.)
 * Colors come from the CSS tokens in glass.css, read from the canvas, and refresh on theme change.
 * Budget: device pixel ratio capped at 1.5, paused off screen and in hidden tabs,
 * a single still frame when the viewer prefers reduced motion.
 */
(function () {
  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const HEAD = 'precision highp float;uniform vec2 u_res;uniform float u_time;uniform float u_dark;uniform vec2 u_mouse;uniform vec3 u_clicks[4];uniform float u_dpr;\n' +
    'uniform vec3 u_base;uniform vec3 u_ink;uniform vec3 u_cool;uniform vec3 u_cool_ink;uniform vec3 u_deep;uniform vec3 u_warm;uniform vec3 u_hot;uniform vec3 u_text;\n';
  const TOKENS = { u_base: '--bg-base', u_ink: '--bg-ink', u_cool: '--gl-cool', u_cool_ink: '--gl-cool-ink', u_deep: '--gl-deep', u_warm: '--gl-warm', u_hot: '--gl-hot', u_text: '--gl-text' };
  const SHADERS = {
    'common': `
// Colors come from CSS tokens (see glass.css): u_base u_ink u_cool u_cool_ink u_deep u_warm u_hot u_text.
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return v;}
float blob(vec2 p,vec2 c,float r){return exp(-dot(p-c,p-c)/(r*r));}
// Soft brand "scene" used behind the glass effects. p: x in 0..aspect, y in 0..1.
vec3 brandScene(vec2 p,float asp,float t){
  vec3 bg=u_base;
  vec3 c1=u_ink, c2=u_cool, c3=u_deep*mix(.92,1.,u_dark);
  vec2 a=vec2(asp*(.30+.10*sin(t*.31)),.62+.10*cos(t*.23));
  vec2 b=vec2(asp*(.70+.08*cos(t*.27)),.38+.12*sin(t*.35));
  vec2 c=vec2(asp*(.52+.18*sin(t*.19+1.)),.18+.10*cos(t*.29));
  vec3 col=bg;
  col=mix(col,c3,blob(p,c,.42)*.9);
  col=mix(col,c2,blob(p,b,.30)*mix(.75,.85,u_dark));
  col=mix(col,c1,blob(p,a,.26)*mix(.85,.9,u_dark));
  return col;
}
// tiny film grain so big gradients don't band
vec3 grain(vec3 c,vec2 fc){return c+(hash(fc+fract(u_time))-.5)*(1.5/255.);}
`,
    'fluted-glass': `
// Fluted glass: vertical cylinder flutes that compress and mirror what's behind them.
// The scene behind needs some crisp shapes, or the flutes just look like stripes.
vec3 behind(vec2 p,float asp,float t){
  vec3 col=brandScene(p,asp,t);
  vec2 dc=vec2(asp*(.62+.10*sin(t*.21)),.58+.06*cos(t*.17));
  col=mix(col,u_ink,smoothstep(.215,.205,length(p-dc))*.95);          // sharp orange disc
  vec2 bq=p-vec2(asp*(.30+.06*cos(t*.15)),.30);
  float bar=length(max(abs(bq)-vec2(.20,.035),0.))-.03;
  col=mix(col,u_cool_ink,smoothstep(.006,0.,bar));  // cyan pill
  return col;
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res; float asp=u_res.x/u_res.y;
  float flutePx=26.*u_dpr;                 // flute width in device px
  float N=u_res.x/flutePx;
  float x=uv.x*N, id=floor(x), f=fract(x)-.5; // f: -.5...5 across one flute
  // each flute is a little lens: it flips + compresses the slice behind it
  float sx=(id+.5-f*1.6)/N;
  vec3 col=vec3(0.);
  for(int i=-2;i<=2;i++){                  // horizontal frosting
    vec2 q=vec2(sx+float(i)*.004,uv.y+float(i)*.002);
    col+=behind(q*vec2(asp,1.),asp,u_time);
  }
  col/=5.;
  // lighting across the curved flute
  float hl=pow(max(0.,1.-abs(f+.22)*5.),3.);         // highlight on the left shoulder
  float sh=smoothstep(.28,.5,abs(f));                  // groove shadow
  vec3 lite=mix(vec3(1.),vec3(1.),u_dark);
  col=mix(col,lite,hl*mix(.35,.12,u_dark));
  col*=1.-sh*mix(.06,.18,u_dark);
  col=mix(col,u_base,.06);           // glass tint
  gl_FragColor=vec4(grain(col,gl_FragCoord.xy),1.);
}
`,
    'lens-distortion': `
// Lens distortion: a glass lens that magnifies, bends and splits color over a pattern.
float pattern(vec2 p,float asp){
  vec2 g=p*vec2(14.);                                  // dot grid
  vec2 f=fract(g)-.5;
  float d=smoothstep(.16,.10,length(f));
  float lines=smoothstep(.035,.0,abs(fract(p.y*7.+p.x*.0)-.5)-.47);
  return max(d,lines*.35);
}
vec3 bgAt(vec2 p,float asp){
  vec3 base=brandScene(p,asp,u_time*.6);
  vec3 ink=mix(u_cool_ink,u_text,u_dark);
  return mix(base,ink,pattern(p,asp)*mix(.22,.26,u_dark));
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res; float asp=u_res.x/u_res.y;
  vec2 p=uv*vec2(asp,1.);
  float t=u_time*.35;
  vec2 drift=vec2(asp*(.5+.28*sin(t)),.5+.22*sin(t*1.7));
  vec2 m=u_mouse*vec2(asp,1.);
  float follow=step(.001,length(u_mouse-vec2(.5)));    // pointer over? follow it
  vec2 c=mix(drift,m,follow);
  float R=.30;
  vec2 d=p-c; float r=length(d)/R;
  vec3 col;
  if(r<1.){
    float k=.42+.58*r*r;                               // barrel: strong magnify in the middle
    float ca=.022*r*r;                                 // chromatic split grows to the rim
    col.r=bgAt(c+d*k*(1.+ca),asp).r;
    col.g=bgAt(c+d*k,asp).g;
    col.b=bgAt(c+d*k*(1.-ca),asp).b;
    float rim=smoothstep(.78,1.,r);
    float spec=pow(max(0.,1.-length(d/R-vec2(-.35,.4))*1.6),4.);
    col=mix(col,vec3(1.),rim*mix(.35,.22,u_dark)+spec*.35);
  }else{
    col=bgAt(p,asp);
    float s=smoothstep(1.35,1.,r)*mix(.10,.35,u_dark); // soft contact shadow
    col*=1.-s;
  }
  gl_FragColor=vec4(grain(col,gl_FragCoord.xy),1.);
}
`,
    'iridescent-shapes': `
// Iridescent shapes: soft 3D-looking blobs with a thin-film color shift.
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdf(vec2 p,float asp,float t){
  vec2 a=vec2(asp*(.34+.05*sin(t*.7)),.55+.06*cos(t*.5));
  vec2 b=vec2(asp*(.48+.06*cos(t*.6)),.40+.05*sin(t*.8));
  float d=length(p-a)-.22;
  d=smin(d,length(p-b)-.16,.14);
  vec2 rc=vec2(asp*.74,.58+.04*sin(t*.4));               // ring
  float ring=abs(length(p-rc)-.15)-.055;
  d=min(d,ring);
  return d;
}
vec3 film(float x){ // thin-film palette, pulled toward brand hues
  vec3 a=vec3(.62,.62,.66),b=vec3(.38,.36,.34),c=vec3(1.),e=vec3(.00,.18,.42);
  vec3 rainbow=a+b*cos(6.2832*(c*x+e));
  return mix(rainbow,mix(u_cool,u_ink,.5+.5*sin(x*6.2832)),.25);
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res; float asp=u_res.x/u_res.y;
  vec2 p=uv*vec2(asp,1.); float t=u_time;
  vec3 bg=u_base;
  bg=mix(bg,u_deep*mix(1.,.6,u_dark),smoothstep(1.2,0.,length(p-vec2(asp*.55,.45)))*.5);
  float d=sdf(p,asp,t);
  float e=.004;
  // height dome from the distance field; normals from the height, so no crease where shapes merge
  #define H(q) sqrt(1.-pow(1.-clamp(-sdf(q,asp,t)/.2,0.,1.),2.))
  float z=H(p);
  vec2 g=vec2(H(p+vec2(e,0))-H(p-vec2(e,0)),H(p+vec2(0,e))-H(p-vec2(0,e)))/(2.*e);
  vec3 n=normalize(vec3(-g*.12,1.));
  vec3 L=normalize(vec3(-.5,.6,.7));
  float fres=1.-n.z;
  vec3 col=film(fres*1.1+dot(n.xy,vec2(.4,.6))*.9+p.x*.35+p.y*.25+t*.05);
  col=mix(col,vec3(1.),.18*(1.-u_dark));
  col=mix(col,vec3(1.),pow(max(0.,dot(reflect(-L,n),vec3(0,0,1))),24.)*.8);
  col=mix(col*mix(.92,.85,u_dark),col,z);
  float shadow=smoothstep(.10,-.02,sdf(p+vec2(-.02,.035),asp,t))*mix(.12,.45,u_dark);
  vec3 outc=bg*(1.-shadow);
  float aa=1.5/u_res.y;
  col=mix(outc,col,smoothstep(aa,-aa,d));
  gl_FragColor=vec4(grain(col,gl_FragCoord.xy),1.);
}
`,
    'thermal-gradient': `
uniform vec3 u_heat[16];uniform float u_heatN;
// Thermal gradient: a heat field mapped through a thermal-camera ramp (cool cyan -> hot orange).
vec3 ramp(float v){
  vec3 s0=u_base;
  vec3 s1=u_deep;
  vec3 s2=u_cool;
  vec3 s3=u_warm;
  vec3 s4=u_ink;
  vec3 s5=u_hot;
  if(v<.22)return mix(s0,s1,v/.22);
  if(v<.45)return mix(s1,s2,(v-.22)/.23);
  if(v<.65)return mix(s2,s3,(v-.45)/.20);
  if(v<.84)return mix(s3,s4,(v-.65)/.19);
  return mix(s4,s5,(v-.84)/.16);
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res; float asp=u_res.x/u_res.y;
  vec2 p=uv*vec2(asp,1.); float t=u_time*.12;
  vec2 w=p+.35*vec2(fbm(p*1.1+t),fbm(p*1.1-t+5.2));       // domain warp = fluid shapes
  float v=fbm(w*1.4+vec2(t,-t*.7))*.65;
  if(u_heatN>0.){                                       // data mode: one hot spot per point (x, y, weight 0..1)
    v*=.75;
    float sc=clamp(asp/3.,.5,1.);                      // narrow stages (phones): smaller spots
    for(int i=0;i<16;i++){
      if(float(i)>=u_heatN)break;
      vec3 h=u_heat[i];
      vec2 c=vec2(h.x*asp+.03*sin(t*1.7+float(i)),h.y+.04*cos(t*1.3+float(i)*1.7));
      v+=blob(w,c,(.20+.16*h.z)*sc)*(.30+.45*h.z);
    }
  }else{                                                // ambient mode: a few slow hot spots
    v+=blob(w,vec2(asp*(.70+.08*sin(t*2.)),.38+.1*cos(t*1.6)),.30)*.45;
    v+=blob(w,vec2(asp*(.48+.1*cos(t*1.1)),.20),.20)*.25;
    v+=blob(p,vec2(asp*(.25+.06*cos(t*1.3)),.72),.22)*.30;
  }
  v=clamp(v*1.05-.08,0.,1.);
  float bands=floor(v*14.)/14.;                         // faint isotherm bands
  v=mix(v,bands,.18);
  gl_FragColor=vec4(grain(ramp(v),gl_FragCoord.xy),1.);
}
`,
    'water-ripples': `
// Water ripples: expanding rings that refract the scene below and catch the light. Click to drop.
float wave(vec2 p,vec2 c,float t0,float asp){
  float age=u_time-t0; if(age<0.||age>6.)return 0.;
  float r=length(p-c);
  float front=age*.28;
  float env=exp(-abs(r-front)*7.)*exp(-age*.35)*smoothstep(0.,.3,age)*1.6;
  return sin((r-front)*55.)*env;
}
float height(vec2 p,float asp){
  float h=0.;
  for(int i=0;i<4;i++){                                  // looping ambient drops
    float fi=float(i);
    float period=6.;
    float cyc=floor((u_time+fi*1.5)/period);
    float t0=cyc*period-fi*1.5;
    vec2 c=vec2(asp*(.2+.6*hash(vec2(cyc,fi))),.2+.6*hash(vec2(fi,cyc+3.)));
    h+=wave(p,c,t0,asp);
  }
  for(int i=0;i<4;i++)h+=wave(p,u_clicks[i].xy*vec2(asp,1.),u_clicks[i].z,asp);
  h+=(noise(p*6.+u_time*.25)-.5)*.08;                   // calm surface shimmer
  return h;
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res; float asp=u_res.x/u_res.y;
  vec2 p=uv*vec2(asp,1.);
  float e=1.5/u_res.y;
  float h=height(p,asp);
  vec2 g=vec2(height(p+vec2(e,0),asp)-h,height(p+vec2(0,e),asp)-h)/e;
  vec2 q=p+g*.0035;                                      // refraction
  vec3 col=brandScene(q,asp,u_time*.25);
  col=mix(col,u_deep,.25);
  vec3 n=normalize(vec3(-g*.004,1.));
  float spec=pow(max(0.,dot(n,normalize(vec3(-.4,.5,1.)))),180.);
  col+=spec*mix(.55,.45,u_dark);
  col*=1.+clamp(dot(g,vec2(-.5,.6))*.006,-.18,.18)*mix(.45,1.,u_dark);
  gl_FragColor=vec4(grain(col,gl_FragCoord.xy),1.);
}
`
  };
  const NAMES = { fluted: 'fluted-glass', lens: 'lens-distortion', iridescent: 'iridescent-shapes', thermal: 'thermal-gradient', ripples: 'water-ripples' };

  const probe = document.createElement('canvas').getContext('2d');
  function rgb(str, fallback) {               // any CSS color -> [r,g,b] 0..1
    probe.fillStyle = '#000'; probe.fillStyle = (str || '').trim() || fallback;
    const v = probe.fillStyle;
    if (v[0] === '#') return [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16) / 255);
    const m = v.match(/[\d.]+/g); return [m[0] / 255, m[1] / 255, m[2] / 255];
  }
  function source(name) {
    const key = NAMES[name] || name;
    if (!SHADERS[key]) throw new Error('Unknown effect: ' + name);
    return HEAD + SHADERS.common + '\n' + SHADERS[key];
  }

  function mount(canvas, name, opts) {
    opts = opts || {};
    const short = Object.keys(NAMES).find(k => NAMES[k] === name) || name;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl) { canvas.classList.add('gl-fallback-' + short); return { destroy() {} }; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, source(name)));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['u_res', 'u_time', 'u_dark', 'u_mouse', 'u_clicks', 'u_dpr'].concat(Object.keys(TOKENS)).forEach(n => U[n] = gl.getUniformLocation(prog, n));

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now() - (opts.timeOffset != null ? opts.timeOffset : 8) * 1000;
    const dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr || 1.5);
    let visible = true, raf = 0, mouse = [0.5, 0.5], target = [0.5, 0.5], colors = null;
    const clicks = new Float32Array(12).fill(-100); let ci = 0;

    function readColors() {
      const cs = getComputedStyle(canvas); colors = {};
      for (const u in TOKENS) colors[u] = rgb(cs.getPropertyValue(TOKENS[u]), '#808080');
      const b = colors.u_base; colors.dark = (0.2126 * b[0] + 0.7152 * b[1] + 0.0722 * b[2]) < 0.5 ? 1 : 0;
    }
    function draw(now) {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      if (!colors) readColors();
      mouse[0] += (target[0] - mouse[0]) * 0.08; mouse[1] += (target[1] - mouse[1]) * 0.08;
      gl.uniform2f(U.u_res, w, h);
      gl.uniform1f(U.u_time, opts.fixedTime != null ? opts.fixedTime : (now - t0) / 1000);
      gl.uniform1f(U.u_dark, colors.dark);
      gl.uniform2f(U.u_mouse, mouse[0], mouse[1]);
      gl.uniform3fv(U.u_clicks, clicks);
      gl.uniform1f(U.u_dpr, dpr);
      for (const u in TOKENS) gl.uniform3fv(U[u], colors[u]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    const still = reduce || opts.fixedTime != null;
    function loop(now) { draw(now); if (visible && !still) raf = requestAnimationFrame(loop); }
    function start() { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    function retheme() { colors = null; start(); }

    const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) start(); });
    io.observe(canvas);
    const onVis = () => { visible = !document.hidden; if (visible) start(); };
    document.addEventListener('visibilitychange', onVis);
    const mo = new MutationObserver(retheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', retheme);
    addEventListener('resize', start);

    if (opts.interactive) {
      const host = opts.pointerTarget || canvas;
      const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]; };
      host.addEventListener('pointermove', e => { target = pos(e); if (still) start(); });
      host.addEventListener('pointerleave', () => { target = [0.5, 0.5]; });
      host.addEventListener('pointerdown', e => { const p = pos(e);
        clicks.set([p[0], p[1], (performance.now() - t0) / 1000], ci * 3); ci = (ci + 1) % 4; start(); });
    }
    start();
    return { destroy() { cancelAnimationFrame(raf); io.disconnect(); mo.disconnect(); mq.removeEventListener('change', retheme); document.removeEventListener('visibilitychange', onVis); } };
  }

  window.AfterstreamGlass = { mount, source, effects: Object.keys(NAMES) };
})();
