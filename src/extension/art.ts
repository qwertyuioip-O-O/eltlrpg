// Local vector artwork: no downloaded assets or remote executable code.
export function drawWarrior(c:CanvasRenderingContext2D,x:number,y:number,strike:number){
 c.save();c.translate(x,y);c.lineJoin='round';c.lineWidth=2;
 const shape=(d:string,fill:string|CanvasGradient,stroke='#172332')=>{const p=new Path2D(d);c.fillStyle=fill;c.fill(p);c.strokeStyle=stroke;c.stroke(p);};
 c.fillStyle='#0005';c.beginPath();c.ellipse(0,36,40,8,0,0,7);c.fill();
 shape('M-13 -37 Q-36 -28 -40 26 L-10 14 L4 -25 Z','#963e50');
 shape('M-14 4 L-18 30 L-3 32 L2 6 Z','#4c637e');shape('M7 4 L9 29 L23 31 L20 0 Z','#6c8199');
 shape('M-19 28 L-20 37 L-1 37 L-3 29 Z','#253443');shape('M9 28 L8 37 L28 37 L23 29 Z','#253443');
 const armor=c.createLinearGradient(-20,-30,20,8);armor.addColorStop(0,'#647f9d');armor.addColorStop(.5,'#c6d5e3');armor.addColorStop(1,'#526983');
 shape('M-15 -35 L13 -35 L23 -14 L15 8 L-14 8 L-23 -14 Z',armor);
 shape('M-22 -34 L-8 -36 L-7 -22 L-28 -20 Z','#93adc7');shape('M11 -36 L27 -29 L28 -18 L11 -22 Z','#93adc7');
 c.strokeStyle='#e9c67d';c.beginPath();c.moveTo(-12,-25);c.lineTo(0,-17);c.lineTo(12,-25);c.stroke();
 shape('M-14 -7 L16 -7 L16 0 L-14 0 Z','#473c36');shape('M-3 -8 L5 -8 L5 1 L-3 1 Z','#d7b267');
 shape('M-14 -58 Q0 -71 15 -57 L17 -37 L-14 -37 Z','#a3b8c8');
 shape('M-13 -54 L15 -54 L14 -45 L-12 -45 Z','#263346');c.fillStyle='#edce83';c.fillRect(2,-51,11,2);
 shape('M-15 -57 Q-25 -73 -10 -82 Q5 -81 4 -66 Z','#b7525b');
 shape('M-27 -24 Q-46 -25 -44 1 Q-33 20 -22 9 L-18 -18 Z','#466a8d','#a7bfd4');
 shape('M-32 -17 L-29 -17 L-29 3 L-32 3 Z','#e9c67d');
 c.save();c.translate(22,-18);c.rotate(-.25+strike*1.9);
 shape('M-4 8 L-4 -52 L0 -65 L5 -52 L5 8 Z','#dbeaf1');c.strokeStyle='#fff';c.beginPath();c.moveTo(0,-52);c.lineTo(0,6);c.stroke();
 shape('M-13 6 L14 6 L14 12 L-13 12 Z','#d7b267');shape('M-3 12 L4 12 L4 28 L-3 28 Z','#714737');c.restore();c.restore();
}
export function drawBoss(c:CanvasRenderingContext2D,index:number,hit:number){
 c.save();c.translate(560+Math.sin(hit*30)*hit*4,218);c.lineWidth=2.5;c.lineJoin='round';
 const shape=(d:string,fill:string|CanvasGradient,stroke='#15202b')=>{const p=new Path2D(d);c.fillStyle=fill;c.fill(p);c.strokeStyle=stroke;c.stroke(p);};
 const glow=(x:number,y:number,color:string,r=8)=>{c.save();c.shadowColor=color;c.shadowBlur=16;c.fillStyle=color;c.beginPath();c.ellipse(x,y,r,r*.55,0,0,7);c.fill();c.restore();};
 c.fillStyle='#0006';c.beginPath();c.ellipse(0,62,85,12,0,0,7);c.fill();
 if(index===0){
  shape('M-40 -51 L-66 -80 L-56 -91 L-78 -106 M-57 -81 L-36 -108 M39 -51 L60 -86 L83 -99 M58 -82 L42 -112','#725a40','#a9b080');
  shape('M-44 -31 L-70 -14 L-79 35 L-63 42 L-40 10 M39 -30 L63 -15 L78 37 L63 44 L37 9','#516848');
  shape('M-29 12 L-37 59 L-10 61 L0 21 L13 60 L39 58 L29 8','#534a38');
  shape('M-35 -49 Q0 -67 36 -49 L47 -7 L29 30 L-30 29 L-47 -6 Z','#647547');
  shape('M-28 -63 L-35 -36 L-16 -11 L14 -11 L33 -37 L23 -64 L0 -76 Z','#8a7753');
  shape('M-20 -53 L-5 -47 L-11 -37 L-25 -43 Z','#283f31');shape('M7 -46 L22 -54 L27 -44 L14 -36 Z','#283f31');glow(-15,-45,'#b6ef83',5);glow(17,-45,'#b6ef83',5);
  for(let i=0;i<5;i++)shape(`M${-27+i*12} -11 l-6 17 l9 -4 l3 -12 Z`,'#a0af68');
  c.strokeStyle='#b3a16b';for(let i=0;i<3;i++){c.beginPath();c.moveTo(-24+i*21,5);c.lineTo(-27+i*23,23);c.stroke();}
 }else if(index===1){
  shape('M-41 -33 L-71 -30 L-87 8 L-73 34 L-51 28 L-40 -4 M39 -34 L72 -29 L86 12 L70 36 L49 26 L40 -5','#555264');
  shape('M-31 11 L-43 53 L-40 65 L-9 65 L-3 19 L15 62 L46 62 L37 11','#484958');
  shape('M-38 -50 L-7 -63 L31 -51 L49 -14 L35 27 L-32 26 L-49 -12 Z','#686373');
  shape('M-18 -81 L16 -81 L29 -64 L20 -41 L-20 -42 L-31 -65 Z','#807981');
  glow(-10,-62,'#ffc267',6);glow(11,-62,'#ffc267',6);
  shape('M0 -38 L-16 -13 L0 9 L18 -13 Z','#ee793b','#ffc36b');glow(0,-12,'#ffd584',9);
  c.strokeStyle='#f8a157';c.lineWidth=3;for(const d of ['M-38 -38 L-24 -21 L-32 -5','M34 -39 L26 -23 L37 -9','M-62 -20 L-69 -1 L-60 16','M23 33 L32 46'])c.stroke(new Path2D(d));
 }else{
  shape('M-22 -39 Q-80 -113 -113 -108 L-100 -72 L-105 -31 L-64 -43 L-32 -4 Z','#62548b','#b29dcf');
  shape('M15 -38 Q61 -109 100 -102 L84 -66 L99 -25 L57 -36 L29 3 Z','#726398','#b29dcf');
  shape('M-27 8 Q-99 13 -103 57 Q-74 40 -45 50 L-12 38 Z','#766590');
  shape('M-20 -53 Q27 -56 43 -17 Q53 17 23 43 L-20 45 Q-48 23 -42 -5 Z','#8575ac');
  shape('M-13 -21 Q11 -26 22 1 L15 38 L-13 38 L-26 4 Z','#c2abc9');
  shape('M-30 -53 L-52 -91 L-34 -84 L-15 -61 M10 -58 L22 -92 L33 -99 L28 -61','#e7d3a0');
  shape('M-20 -73 L-43 -56 L-63 -52 L-64 -30 L-37 -26 L-13 -39 L13 -48 L7 -68 Z','#9a86b9');
  glow(-32,-52,'#a7eaff',6);shape('M-62 -33 L-51 -22 L-47 -33 M-43 -29 L-34 -21 L-31 -34','#f4e5cf');
  shape('M-25 33 L-38 58 L-16 60 L-4 39 M24 29 L41 58 L17 60 L10 39','#766590');
  for(let i=0;i<3;i++)shape(`M${-38+i*10} 58 l4 -9 l4 11 Z`,'#e7d3a0');
 }
 if(hit>0){c.globalAlpha=hit*.4;c.fillStyle='#fff1cb';c.beginPath();c.arc(0,-12,58,0,7);c.fill();}c.restore();
}

