// Seven-segment digits, drawn like the box's wall clock. Supports 0-9, ':', '-' and spaces.
const LIT={0:'abcdef',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgedc',7:'abc',8:'abcdefg',9:'abfgcd','-':'g',' ':''};
const h=(y,a=4,b=20)=>`${a},${y} ${a+2.4},${y-2.4} ${b-2.4},${y-2.4} ${b},${y} ${b-2.4},${y+2.4} ${a+2.4},${y+2.4}`;
const v=(x,a,b)=>`${x},${a} ${x+2.4},${a+2.4} ${x+2.4},${b-2.4} ${x},${b} ${x-2.4},${b-2.4} ${x-2.4},${a+2.4}`;
const SEGMENTS={a:h(3),b:v(21,4,20),c:v(21,22,38),d:h(39),e:v(3,22,38),f:v(3,4,20),g:h(21)};
export function led(text,cls=''){let x=0,out='';
 for(const ch of String(text)){if(ch===':'){out+=`<g transform="translate(${x} 0)"><rect class="on" x="1" y="12" width="4" height="4" rx="1"/><rect class="on" x="1" y="27" width="4" height="4" rx="1"/></g>`;x+=8;continue}
  if(!(ch in LIT))continue;out+=`<g transform="translate(${x} 0)">${Object.entries(SEGMENTS).map(([k,p])=>`<polygon class="${LIT[ch].includes(k)?'on':'off'}" points="${p}"/>`).join('')}</g>`;x+=28}
 return `<svg class="led ${cls}" viewBox="-2 0 ${x+2} 42" role="img" aria-label="${String(text).replace(/[<>&"]/g,'')}"><g transform="skewX(-7)">${out}</g></svg>`;
}
