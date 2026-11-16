// SVG chart builders. Each returns markup; tooltips come from data-tip (rendered with textContent in app.js).
// Marks carry color through classes (style.css); text always uses text tokens.
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=(x,d=0)=>Number(x).toFixed(d);
const tip=lines=>`data-tip="${e([].concat(lines).join('\n'))}" tabindex="0"`;
const niceMax=v=>{if(v<=0)return 1;const p=10**Math.floor(Math.log10(v)),n=v/p;return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p};
const ticks=max=>[0,max/2,max];
const compact=v=>v>=1000?`${f(v/1000,v%1000?1:0)}K`:f(v,v%1===0?0:1);

// Radar: values are percentages of a target (100 = target ring). Axes flagged `priority` get emphasized labels.
export function radar({axes,series,max=150,size=340,label,target=true}){
 const c=size/2,r=size/2-62,ang=i=>-Math.PI/2+i*2*Math.PI/axes.length,pt=(i,v)=>[c+Math.cos(ang(i))*r*Math.min(v,max)/max,c+Math.sin(ang(i))*r*Math.min(v,max)/max];
 const rings=[50,100,150].filter(v=>v<=max).map(v=>`<polygon class="viz-ring ${v===100&&target?'target':''}" points="${axes.map((_,i)=>pt(i,v).map(n=>f(n,1)).join(',')).join(' ')}"/>`).join('');
 const spokes=axes.map((_,i)=>{const [x,y]=pt(i,max);return `<line class="viz-grid" x1="${c}" y1="${c}" x2="${f(x,1)}" y2="${f(y,1)}"/>`}).join('');
 const labels=axes.map((a,i)=>{const [x,y]=pt(i,max+22),anchor=Math.abs(x-c)<8?'middle':x>c?'start':'end';return `<text class="viz-axis-label ${a.priority?'priority':''}" x="${f(x,1)}" y="${f(y+4,1)}" text-anchor="${anchor}">${e(a.label)}${a.priority?' ★':''}</text>`}).join('');
 const shapes=series.map(s=>`<polygon class="viz-area ${s.cls}" points="${axes.map((a,i)=>pt(i,s.values[a.key]??0).map(n=>f(n,1)).join(',')).join(' ')}"/>`).join('');
 const dots=series.map(s=>axes.map((a,i)=>{const [x,y]=pt(i,s.values[a.key]??0);return `<circle class="viz-dot ${s.cls}" cx="${f(x,1)}" cy="${f(y,1)}" r="4"/>`}).join('')).join('');
 const hits=axes.map((a,i)=>{const [x,y]=pt(i,max*.82);return `<circle class="viz-hit" cx="${f(x,1)}" cy="${f(y,1)}" r="16" ${tip([a.label+(a.priority?' · priority':''),...series.map(s=>`${s.name}: ${s.raw?.[a.key]??f(s.values[a.key]??0)}${s.unit||''}`)])}/>`}).join('');
 return `<svg class="viz radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="${e(label)}">${rings}${spokes}${target?(()=>{const a=-Math.PI/2+Math.PI/axes.length,rr=r*100/max+6;return `<text class="viz-tick" x="${f(c+Math.cos(a)*rr,1)}" y="${f(c+Math.sin(a)*rr,1)}">100%</text>`})():''}${shapes}${dots}${labels}${hits}</svg>`;
}

// Columns from a single baseline, with an optional solid target line. items: {label,value,cls,tipLines,selected,attrs}
export function columns({items,height=180,unit='',target,targetLabel=true,label,width=Math.max(320,items.length*56)}){
 const top=18,bottom=34,left=34,plot=height-top-bottom,max=niceMax(Math.max(target||0,...items.map(i=>i.value),1)),band=(width-left-8)/Math.max(1,items.length),bar=Math.min(24,band*.6);
 const y=v=>top+plot-v/max*plot;
 const grid=ticks(max).map(t=>`<line class="viz-grid" x1="${left}" x2="${width-4}" y1="${f(y(t),1)}" y2="${f(y(t),1)}"/><text class="viz-tick" x="${left-6}" y="${f(y(t)+4,1)}" text-anchor="end">${compact(t)}</text>`).join('');
 const marks=items.map((it,i)=>{const x=left+band*i+band/2,h=Math.max(it.value?2:0,plot*it.value/max),r=Math.min(4,h/2);
  return `<g class="viz-col ${it.selected?'selected':''}" ${it.attrs||''} ${tip(it.tipLines||[`${it.label}: ${f(it.value,1)}${unit}`])}><rect class="viz-hit" x="${f(x-band/2+1,1)}" y="${top}" width="${f(band-2,1)}" height="${plot}"/><path class="viz-bar ${it.cls||''}" d="M${f(x-bar/2,1)} ${f(top+plot,1)}V${f(top+plot-h+r,1)}q0 -${r} ${r} -${r}h${f(bar-2*r,1)}q${r} 0 ${r} ${r}V${f(top+plot,1)}Z"/>${it.valueLabel?`<text class="viz-value" x="${f(x,1)}" y="${f(top+plot-h-6,1)}" text-anchor="middle">${e(it.valueLabel)}</text>`:''}<text class="viz-tick" x="${f(x,1)}" y="${height-14}" text-anchor="middle">${e(it.label)}</text>${it.sub?`<text class="viz-tick" x="${f(x,1)}" y="${height-2}" text-anchor="middle">${e(it.sub)}</text>`:''}</g>`}).join('');
 const goal=target?`<line class="viz-target" x1="${left}" x2="${width-4}" y1="${f(y(target),1)}" y2="${f(y(target),1)}"/>${targetLabel?`<text class="viz-tick" x="${width-4}" y="${f(y(target)-5,1)}" text-anchor="end">target ${target}</text>`:''}`:'';
 return `<svg class="viz columns" viewBox="0 0 ${width} ${height}" role="img" aria-label="${e(label)}">${grid}${goal}${marks}<line class="viz-axis" x1="${left}" x2="${width-4}" y1="${top+plot}" y2="${top+plot}"/></svg>`;
}

// Time-based lines. series: {name,cls,points:[{t(ms),y,hollow,tip}]}. Hover columns snap to each date and list every series.
export function lines({series,height=240,unit='',label,width=640,yMin,endLabels=true}){
 const all=series.flatMap(s=>s.points);if(!all.length)return '<p class="muted">Not enough data yet.</p>';
 const top=16,bottom=28,left=40,right=16,plot=height-top-bottom,t0=Math.min(...all.map(p=>p.t)),t1=Math.max(...all.map(p=>p.t));
 const lo=yMin??0,max=niceMax(Math.max(...all.map(p=>p.y))*1.08),x=t=>t1===t0?(left+width-right)/2:left+(t-t0)/(t1-t0)*(width-left-right),y=v=>top+plot-(v-lo)/(max-lo)*plot;
 const grid=[lo,(lo+max)/2,max].map(t=>`<line class="viz-grid" x1="${left}" x2="${width-right}" y1="${f(y(t),1)}" y2="${f(y(t),1)}"/><text class="viz-tick" x="${left-6}" y="${f(y(t)+4,1)}" text-anchor="end">${compact(t)}</text>`).join('');
 const dates=[...new Set(all.map(p=>p.t))].sort((a,b)=>a-b),fmt=t=>new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
 const xt=[dates[0],dates[Math.floor(dates.length/2)],dates.at(-1)].filter((d,i,a)=>a.indexOf(d)===i).map((d,i,a)=>`<text class="viz-tick" x="${f(x(d),1)}" y="${height-8}" text-anchor="${a.length>1&&i===0?'start':a.length>1&&i===a.length-1?'end':'middle'}">${fmt(d)}</text>`).join('');
 const paths=series.map(s=>`<path class="viz-line ${s.cls}" d="${s.points.map((p,i)=>`${i?'L':'M'}${f(x(p.t),1)} ${f(y(p.y),1)}`).join('')}"/>`).join('');
 const dots=series.map(s=>s.points.map(p=>`<circle class="viz-dot ${s.cls} ${p.hollow?'hollow':''}" cx="${f(x(p.t),1)}" cy="${f(y(p.y),1)}" r="4.5"/>`).join('')).join('');
 const ends=endLabels&&series.length<=4?series.map(s=>{const p=s.points.at(-1);return `<text class="viz-value" x="${f(Math.min(x(p.t)+8,width-right),1)}" y="${f(y(p.y)-8,1)}" text-anchor="${x(p.t)>width-90?'end':'start'}">${e(s.name)} ${compact(p.y)}${unit}</text>`}).join(''):'';
 const hovers=dates.map((d,i)=>{const a=i?(x(dates[i-1])+x(d))/2:left,b=i<dates.length-1?(x(d)+x(dates[i+1]))/2:width-right,rows=series.map(s=>{const p=s.points.find(q=>q.t===d);return p?`${s.name}: ${p.tip||compact(p.y)+unit}`:null}).filter(Boolean);
  return `<g class="viz-cross" ${tip([fmt(d),...rows])}><rect class="viz-hit" x="${f(a,1)}" y="${top}" width="${f(Math.max(4,b-a),1)}" height="${plot}"/><line class="viz-crossline" x1="${f(x(d),1)}" x2="${f(x(d),1)}" y1="${top}" y2="${top+plot}"/></g>`}).join('');
 return `<svg class="viz lines" viewBox="0 0 ${width} ${height}" role="img" aria-label="${e(label)}">${grid}${xt}<line class="viz-axis" x1="${left}" x2="${width-right}" y1="${top+plot}" y2="${top+plot}"/>${hovers}${paths}${dots}${ends}</svg>`;
}

// Scatter of sessions over time with a rolling median. points: {t,y,cls,tip,attrs}
export function scatter({points,median,height=260,label,width=680,unit=''}){
 if(!points.length)return '<p class="muted">No sessions yet.</p>';
 const top=16,bottom=28,left=40,right=16,plot=height-top-bottom,t0=Math.min(...points.map(p=>p.t)),t1=Math.max(...points.map(p=>p.t)),max=niceMax(Math.max(...points.map(p=>p.y))*1.08);
 const x=t=>t1===t0?(left+width-right)/2:left+(t-t0)/(t1-t0)*(width-left-right),y=v=>top+plot-v/max*plot,fmt=t=>new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
 const grid=ticks(max).map(t=>`<line class="viz-grid" x1="${left}" x2="${width-right}" y1="${f(y(t),1)}" y2="${f(y(t),1)}"/><text class="viz-tick" x="${left-6}" y="${f(y(t)+4,1)}" text-anchor="end">${compact(t)}</text>`).join('');
 const xt=[t0,(t0+t1)/2,t1].map((d,i)=>`<text class="viz-tick" x="${f(x(d),1)}" y="${height-8}" text-anchor="${['start','middle','end'][i]}">${fmt(d)}</text>`).join('');
 const med=median?.length>1?`<path class="viz-line median" d="${median.map((p,i)=>`${i?'L':'M'}${f(x(p.t),1)} ${f(y(p.y),1)}`).join('')}"/>`:'';
 const dots=points.map(p=>`<g class="viz-point" ${p.attrs||''} ${tip(p.tip)} role="button"><circle class="viz-hit" cx="${f(x(p.t),1)}" cy="${f(y(p.y),1)}" r="13"/><circle class="viz-dot ${p.cls}" cx="${f(x(p.t),1)}" cy="${f(y(p.y),1)}" r="${p.r||5.5}"/>${p.label?`<text class="viz-value" x="${f(x(p.t),1)}" y="${f(y(p.y)-11,1)}" text-anchor="${x(p.t)>width-120?'end':'middle'}">${e(p.label)}</text>`:''}</g>`).join('');
 return `<svg class="viz scatter" viewBox="0 0 ${width} ${height}" role="img" aria-label="${e(label)}">${grid}${xt}<line class="viz-axis" x1="${left}" x2="${width-right}" y1="${top+plot}" y2="${top+plot}"/>${med}${dots}</svg>`;
}

// Heat grid using the app's muscle-map heat steps. cells[r][c] = {v,tip}; level picks the step.
export function heatGrid({rows,cols,cells,level,label,highlight=()=>false}){
 const cw=54,rh=24,lw=96,top=22,width=lw+cols.length*cw,height=top+rows.length*rh+4;
 const head=cols.map((c,i)=>`<text class="viz-tick" x="${lw+i*cw+cw/2}" y="14" text-anchor="middle">${e(c)}</text>`).join('');
 const body=rows.map((r,j)=>`<text class="viz-axis-label ${highlight(r)?'priority':''}" x="${lw-8}" y="${top+j*rh+16}" text-anchor="end">${e(r)}${highlight(r)?' ★':''}</text>${cols.map((_,i)=>{const cell=cells[j][i];return `<g ${tip(cell.tip)}><rect class="viz-cell heat-${level(cell.v)}" x="${lw+i*cw+1}" y="${top+j*rh+1}" width="${cw-2}" height="${rh-2}" rx="3"/><text class="viz-cell-text" x="${lw+i*cw+cw/2}" y="${top+j*rh+16}" text-anchor="middle">${cell.v?f(cell.v,cell.v%1?1:0):'·'}</text></g>`}).join('')}`).join('');
 return `<svg class="viz heat" viewBox="0 0 ${width} ${height}" role="img" aria-label="${e(label)}">${head}${body}</svg>`;
}

// Horizontal bars for rankings: items {label,sub,value,cls,tip,attrs,valueLabel}
export function hbars({items,label,max}){
 const m=max||Math.max(...items.map(i=>i.value),1);
 return `<div class="hbars" role="list" aria-label="${e(label)}">${items.map(it=>`<button class="hbar" role="listitem" ${it.attrs||''} ${tip(it.tip)}><span class="hbar-rank">${e(it.rank)}</span><span class="hbar-label"><b>${e(it.label)}</b><small>${e(it.sub)}</small></span><span class="hbar-track"><i class="${it.cls||''}" style="width:${f(Math.max(2,it.value/m*100),1)}%"></i></span><span class="hbar-value">${e(it.valueLabel??it.value)}</span>${it.badge||''}</button>`).join('')}</div>`;
}

export const tableView=(caption,head,rows)=>`<details class="viz-table"><summary>Table view</summary><div class="table-wrap"><table class="scan-table"><caption class="sr-only">${e(caption)}</caption><thead><tr>${head.map(h=>`<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
