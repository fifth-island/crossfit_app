import {MAP,GROUPS} from './data.js';
import {weekStart,shift} from './model.js';
import {TARGETS} from './insight-model.js';
// Rules-based training analytics. Every number here is derived from the saved log; estimates are labeled as such.
export const PRIORITY=['Chest','Biceps','Triceps','Glutes'];
// Weekly exposure targets in points: a direct exercise is 2, a primary role in a compound movement 1, a secondary role 0.5.
// Priority muscles aim for about two direct sessions a week (twice-weekly frequency); other regions for one meaningful exposure.
// Plans for weeks starting on or after this date were visible in the app ahead of time; earlier ones are hindsight.
export const PLANS_LIVE_FROM='2026-10-26';
// Balance items (rows, face pulls, core, hamstring curls) start with the plan for this week, so earlier follow-through is judged against what was shown.
export const BALANCE_LIVE_FROM='2026-11-02';
export const TARGET_POINTS={priority:4,other:2};
export const targetFor=g=>PRIORITY.includes(g)?TARGET_POINTS.priority:TARGET_POINTS.other;
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const eligible=m=>m.status==='confirmed'&&m.section!=='Warm-up';
const performed=m=>m.status!=='skipped';
const DIRECT=Object.fromEntries(TARGETS.map(t=>[t.muscle,t.names]));
export const isDirect=(m,g)=>!!DIRECT[g]?.has(norm(m.name));
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),h=s.length>>1;return s.length%2?s[h]:(s[h-1]+s[h])/2};
const mean=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:null;
const round=(x,d=0)=>x==null?null:Math.round(x*10**d)/10**d;
const byDate=list=>[...list].sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));

export function weightFor(m,g){
 if(!m.groups.includes(g))return 0;if(isDirect(m,g))return 2;
 const ref=MAP[m.name];if(ref?.includes(g))return ref.indexOf(g)<2?1:.5;
 return m.groups.length<=2?1:.5;
}
// One session can contribute at most 3 points to a muscle, so a long chipper does not outweigh a focused session.
export function sessionExposure(s){
 const points=Object.fromEntries(GROUPS.map(g=>[g,0])),direct={};
 for(const m of s.movements.filter(eligible))for(const g of m.groups){if(!(g in points))continue;points[g]+=weightFor(m,g);if(isDirect(m,g))(direct[g]??=[]).push(m.name)}
 for(const g of GROUPS)points[g]=Math.min(3,points[g]);
 return {points,direct};
}

// Movement patterns for the balance radar. A movement can belong to more than one pattern.
export const PATTERNS=['Horizontal push','Vertical push','Pull','Squat','Hinge','Lunge','Core','Engine','Plyometric','Arm isolation'];
const RULES=[
 ['Horizontal push',/bench|floor press|incline db press|(^|\s)push-up|\bdip\b|fly|crucifix/],
 ['Vertical push',/shoulder-to-overhead|press|jerk|thruster|handstand|wall walk|devil|wall ball|man maker|human maker/],
 ['Pull',/row\b(?!\/)|pull-up|chin-up|rope climb|muscle-up|face pull|reverse fly/],
 ['Squat',/squat|thruster|wall ball/],
 ['Hinge',/deadlift|clean|snatch|swing|romanian|hip thrust|glute bridge|good morning|back extension|devil|man maker/],
 ['Lunge',/lunge|step-up|split squat|shuttle/],
 ['Core',/toes-to-bar|sit-up|plank|hollow|ghd|v-up|knees-to|knee raise/],
 ['Engine',/^row$|^run$|bike|ski|double-under|single-under|machine calories|buy-in|shuttle/],
 ['Plyometric',/box jump|burpee|jumping/],
 ['Arm isolation',/curl|triceps? (extension|pushdown|rope)|cable extension|skull|kickback/]
];
// Balance checks that muscle points cannot see: pull-ups count as back work, so missing rows would go unnoticed.
const KNEE_FLEXION=/hamstring curl|leg curl|nordic|glute[- ]ham raise/i;
export const BALANCE={
 row:{label:'rows (horizontal pulling)',test:n=>n.toLowerCase()!=='seated ez-bar preacher row'&&/row\b(?!\/)/i.test(n)&&!/^row$/i.test(n)},
 rearDelt:{label:'rear-shoulder work',test:n=>/face pull|reverse fly|rear delt/i.test(n)},
 core:{label:'direct core work',test:n=>patternsOf(n).includes('Core')},
 kneeFlexion:{label:'hamstring curls (knee flexion)',test:n=>KNEE_FLEXION.test(n)}
};
export function balanceOf(sessions){
 const names=sessions.flatMap(s=>s.movements.filter(eligible).map(m=>m.name));
 return {...Object.fromEntries(Object.entries(BALANCE).map(([k,b])=>[k,names.some(b.test)])),pressing:sessions.filter(s=>s.movements.some(m=>eligible(m)&&patternsOf(m.name).some(p=>p.endsWith('push')))).length};
}
export function patternsOf(name){
 const n=String(name).toLowerCase().trim();if(KNEE_FLEXION.test(n))return [];
 if(n==='seated ez-bar preacher row')return []; // Name in the source is ambiguous.
 if(n==='reverse fly')return ['Pull'];
 if(n==='sled push')return ['Engine'];
 if(n==='mb slam')return ['Core'];
 const out=new Set(RULES.filter(([,re])=>re.test(n)).map(([p])=>p));
 if(/handstand|plank/.test(n))out.delete('Horizontal push');
 if(out.has('Horizontal push'))out.delete('Vertical push');
 if(/split squat/.test(n))out.delete('Squat');
 if(n==='row')out.delete('Pull');
 return PATTERNS.filter(p=>out.has(p));
}

const clock=(m,s)=>Number(m)+Number(s)/60;
// Minutes and pseudo-RPE intensity per section. A user-entered duration and session RPE (1–10) replace the estimate.
export function estimateDemand(s){
 const moves=s.movements.filter(performed),has=sec=>moves.some(m=>m.section===sec);
 const fmt=String(s.format||''),score=String(s.score||''),parts=[];
 if(has('WOD')){
  const total=score.match(/total\s*(\d{1,2}):([0-5]\d)/i),time=total||score.match(/(\d{1,2}):([0-5]\d)/);
  let blocks=0;for(const x of fmt.matchAll(/(?:(\d+)\s*[×x]\s*)?(\d+)-minute(?!\s*cap)/gi))blocks+=(Number(x[1])||1)*Number(x[2]);
  const km=[...fmt.matchAll(/(\d+(?:\.\d+)?)\s*K\b/g)].reduce((n,x)=>n+Number(x[1]),0),cap=fmt.match(/(\d+)-minute\s*cap/i);
  const [minutes,source]=time?[clock(time[1],time[2]),'score']:blocks?[blocks+km*4.5,'format']:cap?[Number(cap[1]),'cap']:[15,'assumed'];
  const interval=/emom|emotm|every/i.test(fmt),continuous=/amrap|for time|hyrox|rounds|rft/i.test(fmt);
  parts.push({section:'WOD',minutes,intensity:interval&&continuous?7.5:interval?7:continuous?8:7.5,source});
 }
 if(has('Strength')){const lifts=new Set(moves.filter(m=>m.section==='Strength').map(m=>m.name)).size,heavy=moves.some(m=>m.section==='Strength'&&/1rm|heav|100%|max/i.test(m.prescription+' '+m.result));parts.push({section:'Strength',minutes:Math.min(24,12+6*(lifts-1)),intensity:heavy?7:6,source:'assumed'})}
 if(has('Skill'))parts.push({section:'Skill',minutes:10,intensity:4,source:'assumed'});
 if(has('Extra'))parts.push({section:'Extra',minutes:5*new Set(moves.filter(m=>m.section==='Extra').map(m=>m.name)).size,intensity:6,source:'assumed'});
 const groups=new Set(s.movements.filter(eligible).flatMap(m=>m.groups)).size,breadth=.85+.025*groups;
 const estMinutes=parts.reduce((n,p)=>n+p.minutes,0),estLoad=parts.reduce((n,p)=>n+p.minutes*p.intensity,0)*breadth;
 const minutes=Number.isFinite(s.minutes)&&s.minutes>0?s.minutes:estMinutes,rpe=Number.isFinite(s.rpe)?s.rpe:null;
 const points=rpe!=null?rpe*minutes:estMinutes?estLoad*minutes/estMinutes:0;
 return {points:round(points),minutes:round(minutes,1),intensity:minutes?round(points/minutes,1):0,groups,breadth:round(breadth,3),parts,rated:rpe!=null,timed:Number.isFinite(s.minutes)&&s.minutes>0,estimated:rpe==null};
}

export const vsLabel=(r,n=3)=>r==null?(n?`Building a baseline (${n} of 3 earlier sessions)`:'First session · no baseline yet'):r>=1.25?'Much harder than usual':r>=1.1?'Harder than usual':r>0.9?'About your usual':r>0.75?'Lighter than usual':'Much lighter than usual';
// Each session against the median of the ten sessions before it, plus its loads against your heaviest earlier entry.
export function sessionStats(sessions){
 const rows=byDate(sessions).map(s=>({session:s,...estimateDemand(s),exposure:sessionExposure(s)}));
 const ranked=[...rows].sort((a,b)=>b.points-a.points||a.session.date.localeCompare(b.session.date));
 const byIntensity=[...rows].sort((a,b)=>b.intensity-a.intensity);
 rows.forEach((r,i)=>{
  r.rank=ranked.indexOf(r)+1;r.intensityRank=byIntensity.indexOf(r)+1;r.of=rows.length;
  const prior=rows.slice(Math.max(0,i-10),i).filter(p=>p.session.date<r.session.date);r.baseline=prior.length;r.typical=prior.length>=3?median(prior.map(p=>p.points)):null;
  r.ratio=r.typical?r.points/r.typical:null;r.verdict=vsLabel(r.ratio,prior.length);
  r.priorityHit=PRIORITY.filter(g=>r.exposure.points[g]>0);r.directHit=PRIORITY.filter(g=>r.exposure.direct[g]);
  r.loads=r.session.movements.filter(m=>eligible(m)&&m.load!=null).map(m=>{
   const earlier=rows.slice(0,i).filter(p=>p.session.date<r.session.date).flatMap(p=>p.session.movements.filter(x=>eligible(x)&&x.load!=null&&x.name===m.name&&x.section===m.section).map(x=>x.load));
   const best=earlier.length?Math.max(...earlier):null;
   return {name:m.name,section:m.section,load:m.load,best,status:best==null?'first':m.load>best?'best':m.load===best?'matched':'below'};
  });
 });
 return rows;
}

// Plan exercises also match what was logged under a close name (e.g. "Cable Curl" for the Bayesian slot).
const ALIASES={'Bayesian Cable Curl':['Cable Curl'],'Overhead Cable Extension':['Overhead Triceps Extension'],'Tricep Rope Pushdown':['Triceps Pushdown'],'Hammer Curl':['DB Seated Hammer Curl'],'Low-to-high Cable Fly':['Cable Fly'],'Mid Cable Fly':['Cable Fly','Chest Crucifix'],'High-to-low Cable Fly':['Cable Fly']};
// The most recent confirmed entry: `load` is a confirmed total load; otherwise the result text is shown as logged (e.g. per-side cable loads).
const lastLoadText=(sessions,name)=>{
 const names=[name,...(ALIASES[name]||[])].map(norm);
 for(const s of byDate(sessions).reverse()){const m=s.movements.find(x=>eligible(x)&&names.includes(norm(x.name)));if(m)return {load:m.load,date:s.date,result:m.result,name:m.name}}
 return null;
};
// Accessory options available in a typical box. Plans prefer repeating last week's direct exercise (progression needs repetition), then rotate.
export const LIBRARY={
 Glutes:[['Hip Thrust','3 × 8–12, 1 s squeeze'],['Romanian Deadlift','3 × 8–10'],['Bulgarian Split Squat','3 × 8–10 per leg'],['Glute Bridge','3 × 12–15'],['Step-up','3 × 10 per leg'],['Kettlebell Swing','3 × 15']],
 Shoulders:[['Lateral Raise','2 × 12–15']],
 'Upper back':[['Face Pull','2 × 15'],['Reverse Fly','2 × 12–15']],
 Lats:[['Single Arm DB Row','3 × 8–10 per arm'],['Pull-up','3 × 3–6']],
 Core:[['Hollow Hold','3 × 30 s'],['Plank','3 × 40 s']],
 'Lower back':[['Back Extension','2 × 12–15']],
 Quads:[['Goblet Squat','3 × 10–12']],
 Hamstrings:[['Hamstring Curl','2 × 10–12'],['Romanian Deadlift','3 × 8–10']],
 Calves:[['Calf Raise','3 × 15–20']]
};
// The accessory program he chose on 2026-10-24: cable flies at three angles plus one incline press for chest,
// stretch-position curls and overhead extensions for arms. Each priority muscle is trained on both days.
export const BALANCE_OPTIONS={
 row:[['Seated Cable Row','3 × 10–12'],['Single Arm DB Row','3 × 10–12 per arm']],
 rearDelt:['Face Pull','2 × 15'],
 core:[['Hanging Knee Raise','3 × 10–15'],['Hollow Hold','3 × 30 s']],
 kneeFlexion:['Hamstring Curl','3 × 8–12']
};
export const PROGRAM={
 Chest:{A:[['Low-to-high Cable Fly','3 × 12–15','Upper-chest emphasis'],['Mid Cable Fly','2 × 10–12','Mid-chest']],B:[['Incline DB Press','3 × 8–10','A heavier press you can track; skip it if class has a bench press strength day'],['High-to-low Cable Fly','3 × 10–12','Lower-chest emphasis']]},
 Biceps:{A:[['Incline DB Curl','3 × 10–12','Trains the biceps from a full stretch']],B:[['Bayesian Cable Curl','3 × 10–12','Stretch plus constant cable tension'],['Hammer Curl','3 × 10–12','Brachialis and forearm thickness']]},
 Triceps:{A:[['Overhead Cable Extension','3 × 10–12','Stretches the long head, the largest part of the triceps']],B:[['Tricep Rope Pushdown','3 × 12–15','Easy to load and progress']]}
};
function buildPlan(sessions,w,index,acwr){
 const blocks={A:[],B:[]},notes=[],taken=new Set(),trim=p=>acwr>1.5?p.replace(/^3 ×/,'2 ×'):p;
 const add=(key,muscle,name,prescription,why)=>{if(taken.has(norm(name)))return false;taken.add(norm(name));blocks[key].push({muscle,name,prescription:trim(prescription),why,last:lastLoadText(sessions,name)});return true};
 const smaller=()=>blocks.A.length<=blocks.B.length?'A':'B';
 for(const g of Object.keys(PROGRAM)){
  const p=w.priority.find(x=>x.muscle===g),met=p.status==='met';
  const reason=met?`${g} met the target; this keeps it there.`:p.direct.length?`${g} had direct work in only ${p.sessionsDirect} session${p.sessionsDirect===1?'':'s'}.`:`No direct ${g.toLowerCase()} work this week.`;
  for(const key of ['A','B']){const opts=PROGRAM[g][key],chosen=opts.length>1&&g!=='Chest'?[opts[index%opts.length]]:opts;(met&&g==='Chest'?chosen.slice(0,1):chosen).forEach(([name,pres,role])=>add(key,g,name,pres,`${reason} ${role}.`))}
 }
 // Glutes and neglected regions draw from the general library, repeating a recent exercise when it is on the list.
 const pick=(muscle,why)=>{
  const opts=LIBRARY[muscle]||[],recent=[...new Set(sessions.filter(s=>s.date>shift(w.end,-21)).reverse().flatMap(s=>s.movements.filter(m=>eligible(m)&&isDirect(m,muscle)).map(m=>m.name)))];
  const again=opts.find(([n])=>recent.some(r=>norm(r)===norm(n)));
  for(const [name,pres] of again?[again]:opts.map((_,k)=>opts[(index+k)%opts.length]))if(add(smaller(),muscle,name,pres,again?`Repeat ${name} and beat last time's reps or load.`:why))return;
 };
 const glutes=w.priority.find(p=>p.muscle==='Glutes');
 if(glutes.status!=='met')pick('Glutes',glutes.points?`Glutes only got ${glutes.points} points, mostly indirect.`:'No documented glute work this week.');
 else if(glutes.sessionsDirect<2)notes.push(`Glutes came mostly from class work (${glutes.points} pts). Add ${LIBRARY.Glutes[w.index%LIBRARY.Glutes.length][0]} only if you want extra emphasis.`);
 // Balance: rows and face pulls when the week had pressing but none; core and hamstring curls once a week when missing.
 const bal=BALANCE_LIVE_FROM<=shift(w.start,7)?w.balance:{row:true,rearDelt:true,core:true,kneeFlexion:true,pressing:0},place=(kind,muscle,[name,pres],why,keys=[smaller()])=>keys.forEach(k=>{blocks[k].push({muscle,name,prescription:trim(pres),why,kind,last:lastLoadText(sessions,name)});taken.add(norm(name))});
 if(bal.pressing&&!bal.row)place('row','Upper back',BALANCE_OPTIONS.row[index%2],`Pressing in ${bal.pressing} session${bal.pressing===1?'':'s'} and no rows. Balances the chest and shoulder work.`);
 if(bal.pressing&&!bal.rearDelt)place('rearDelt','Upper back',BALANCE_OPTIONS.rearDelt,'Rear shoulders get no direct work. Light and quick on both days for shoulder health.',['A','B']);
 if(!bal.core)place('core','Core',BALANCE_OPTIONS.core[index%2],'No toes-to-bar, sit-ups, planks or hollow holds this week.');
 if(!bal.kneeFlexion)place('kneeFlexion','Hamstrings',BALANCE_OPTIONS.kneeFlexion,'Deadlifts, cleans and swings train hamstrings at the hip only. Use Nordic curls if there is no machine.');
 // Lower back and calves score low on paper but deadlifts and running load them heavily, so they are skipped when present.
 const low=GROUPS.filter(g=>!PRIORITY.includes(g)&&w.exposure[g]<1&&!(g==='Lower back'&&w.pattern.Hinge)&&!(g==='Calves'&&w.pattern.Engine>=2)).sort((a,b)=>w.exposure[a]-w.exposure[b]);
 for(const g of low.slice(0,2))if(blocks.A.length+blocks.B.length<12)pick(g,w.exposure[g]?`${g} got only ${w.exposure[g]} point this week.`:`No documented ${g.toLowerCase()} work this week.`);
 const heavy=GROUPS.filter(g=>!PRIORITY.includes(g)&&w.exposure[g]>=targetFor(g)*2&&![...blocks.A,...blocks.B].some(i=>i.muscle===g||(g==='Shoulders'&&i.kind==='rearDelt'))).sort((a,b)=>w.exposure[b]-w.exposure[a]).slice(0,3);
 if(heavy.length)notes.push(`${list(heavy)} already got plenty from class work, so the plan adds none.`);
 // Accessory work itself raises weekly load, so sets are only trimmed above ×1.5 (the usual high-risk zone); ×1.3–1.5 is a caution.
 if(acwr>1.5)notes.push(`Training load rose to ×${acwr.toFixed(2)} your recent weekly average, so sets are trimmed to two.`);
 else if(acwr>1.3)notes.push(`Training load is ×${acwr.toFixed(2)} your recent weekly average. Keep three sets, but drop to two if sleep, soreness or performance slip.`);
 if(acwr!=null&&acwr<0.8)notes.push(`This was a lighter week (×${acwr.toFixed(2)}). There is room for both blocks.`);
 if(w.priority.find(p=>p.muscle==='Chest').status==='met')notes.push('Chest met the target, so each day keeps one chest exercise instead of two.');
 const added=['row','rearDelt','core','kneeFlexion'].filter(k=>[...blocks.A,...blocks.B].some(i=>i.kind===k));
 if(added.length)notes.push(`Balance work added for ${list(added.map(k=>BALANCE[k].label))}. It drops out once you do it in a week.`);
 if(blocks.A.length+blocks.B.length>=10)notes.push('To save time, run pairs as supersets within each block: a chest exercise with the row or face pull, and a curl with a triceps exercise.');
 return {forWeek:shift(w.start,7),items:[...blocks.A,...blocks.B],blocks,notes};
}

const list=a=>a.length<=1?a.join(''):`${a.slice(0,-1).join(', ')} and ${a.at(-1)}`;
const fmtLb=x=>`${round(x,1)} lb`;
export function weeklyReviews(journal,{today}={}){
 const sessions=byDate(journal.sessions||[]);if(!sessions.length)return [];
 const stats=sessionStats(sessions),statById=new Map(stats.map(r=>[r.session.id,r])),weeks=[];
 for(let w=weekStart(sessions[0].date);w<=weekStart(sessions.at(-1).date);w=shift(w,7)){
  const rows=sessions.filter(s=>s.date>=w&&s.date<=shift(w,6)),st=rows.map(s=>statById.get(s.id));
  const exposure=Object.fromEntries(GROUPS.map(g=>[g,round(st.reduce((n,r)=>n+r.exposure.points[g],0),1)])),direct={};
  st.forEach(r=>Object.entries(r.exposure.direct).forEach(([g,names])=>(direct[g]??=[]).push(...names)));
  // Acute:chronic ratio against up to four earlier weeks (uncoupled); two earlier weeks are required before it is judged.
  const points=round(st.reduce((n,r)=>n+r.points,0)),prev=weeks.slice(-4).filter(x=>x.points>0),chronic=prev.length>=2?mean(prev.map(x=>x.points)):null;
  const acwr=chronic?points/chronic:null;
  // Met = direct work in two separate sessions plus the point target, or at least twice the target from compound work alone.
  const priority=PRIORITY.map(g=>{const target=targetFor(g),pts=exposure[g],d=[...new Set(direct[g]||[])],sessionsDirect=st.filter(r=>r.exposure.direct[g]).length;return {muscle:g,points:pts,target,direct:d,sessionsDirect,status:(sessionsDirect>=2&&pts>=target)||pts>=target*2?'met':pts>=target/2||sessionsDirect?'partial':'missed'}});
  const loads=st.flatMap(r=>r.loads.map(l=>({...l,date:r.session.date})));
  const pattern=Object.fromEntries(PATTERNS.map(p=>[p,rows.filter(s=>s.movements.some(m=>eligible(m)&&patternsOf(m.name).includes(p))).length]));
  // Weekly score out of 100: attendance 20, priority muscles 40, balance across 12 regions 15, load progression 10, load management 15.
  const breakdown={attendance:Math.min(1,rows.length/4)*20,priority:mean(priority.map(p=>p.status==='met'?1:Math.min(1,p.points/p.target)*.5+(p.sessionsDirect?.3:0)))*40,balance:GROUPS.filter(g=>exposure[g]>=1).length/GROUPS.length*15,progression:loads.some(l=>l.status==='best')?10:loads.some(l=>l.status==='matched')?7:loads.length&&loads.every(l=>l.status==='below')?4:5,load:acwr==null?10:acwr>=.8&&acwr<=1.3?15:acwr>=.6&&acwr<=1.5?8:3};
  const score=Math.round(Object.values(breakdown).reduce((n,x)=>n+x,0));
  const end=shift(w,6),inProgress=!!today&&w<=today&&end>=today;
  weeks.push({start:w,end,index:weeks.length,inProgress,balance:balanceOf(rows),sessions:rows,stats:st,points,chronic:round(chronic),acwr:round(acwr,2),exposure,direct,priority,loads,pattern,breakdown,score,grade:score>=80?'Strong':score>=65?'Solid':score>=50?'Uneven':'Light',hardest:[...st].sort((a,b)=>b.points-a.points)[0]||null,unconfirmed:rows.flatMap(s=>s.movements).filter(m=>m.status==='unconfirmed'&&m.section!=='Warm-up').length});
 }
 weeks.forEach((w,i)=>{w.plan=buildPlan(sessions.filter(s=>s.date<=w.end),w,i,w.acwr);w.wins=wins(w);w.improve=improvements(w);w.gaps=gaps(w)});
 weeks.forEach((w,i)=>{const prev=weeks[i-1];if(!prev){w.followThrough=null;return}
  const done=new Set(w.sessions.flatMap(s=>s.movements.filter(eligible).map(m=>norm(m.name))));
  const unique=prev.plan.items.filter((it,k,a)=>a.findIndex(x=>x.name===it.name)===k);
  const items=unique.map(it=>({...it,exact:done.has(norm(it.name)),covered:done.has(norm(it.name))||(it.kind?w.balance[it.kind]:!!w.direct[it.muscle]?.length||(!PRIORITY.includes(it.muscle)&&w.exposure[it.muscle]>0))}));
  w.followThrough={items,covered:items.filter(i=>i.covered).length,total:items.length};
 });
 return weeks;
}
const dayLabel=d=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
function wins(w){
 const out=[];
 if(w.sessions.length>=4)out.push(`${w.sessions.length} sessions. You kept a steady rhythm.`);
 for(const p of w.priority.filter(p=>p.direct.length)){const d=[...new Set(p.direct)];out.push(`${p.muscle} got direct work: ${d.length>3?`${d.slice(0,3).join(', ')} and ${d.length-3} more`:list(d)}.`)}
 for(const p of w.priority.filter(p=>p.status==='met'&&!p.direct.length))out.push(`${p.muscle} got ${p.points} points from compound work (squats, hinges, lunges), at least twice the target.`);
 // One line for all heavier loads; a movement that improved twice in a week reports its top load against the earlier best.
 const bests=Object.values(w.loads.filter(l=>l.status==='best').reduce((o,l)=>{const k=l.name+'|'+l.section,c=o[k];o[k]=c?{...l,best:Math.min(c.best,l.best),load:Math.max(c.load,l.load)}:l;return o},{}));
 if(bests.length)out.push(`Heaviest logged: ${list(bests.map(l=>`${l.name}${l.section==='Strength'?'':` (${l.section})`} ${fmtLb(l.load)}, up from ${fmtLb(l.best)}`))}.`);
 if(w.acwr!=null&&w.acwr>=.8&&w.acwr<=1.3)out.push(`Training load stayed steady at ×${w.acwr.toFixed(2)} your recent weekly average.`);
 if(w.hardest&&w.hardest.rank<=3)out.push(`${w.hardest.session.title} ranks #${w.hardest.rank} of ${w.hardest.of} on demand.`);
 const covered=GROUPS.filter(g=>w.exposure[g]>=1).length;if(covered>=11)out.push(`${covered} of 12 muscle regions got at least one meaningful exposure.`);
 return out;
}
function improvements(w){
 const out=[];
 for(const p of w.priority.filter(p=>p.status!=='met'))out.push(p.direct.length?`${p.muscle}: direct work in ${p.sessionsDirect} session${p.sessionsDirect===1?'':'s'} (${p.points} of ${p.target} pts). Add a second direct exposure on another day.`:p.points?`${p.muscle} only got indirect work (${p.points} pts). Add a direct exercise.`:`${p.muscle} had no documented work.`);
 if(w.acwr!=null&&w.acwr>1.5)out.push(`Training load jumped to ×${w.acwr.toFixed(2)} your recent average. Prioritize sleep and keep accessory work short.`);
 else if(w.acwr!=null&&w.acwr>1.3)out.push(`Training load is up to ×${w.acwr.toFixed(2)} your recent average. Watch sleep, soreness and performance.`);
 if(w.acwr!=null&&w.acwr<.8&&!w.inProgress)out.push(`A lighter week (×${w.acwr.toFixed(2)} your recent average).`);
 if(w.sessions.length<3&&!w.inProgress)out.push(`Only ${w.sessions.length} session${w.sessions.length===1?'':'s'}. Aim for at least 3–4.`);
 for(const l of w.loads.filter(l=>l.status==='below'&&l.section==='Strength'))out.push(`${l.name} strength: ${fmtLb(l.load)} vs ${fmtLb(l.best)} best. Check whether the rep scheme differed.`);
 if(w.balance.pressing>=2&&!w.balance.row)out.push(`Pressing in ${w.balance.pressing} sessions but no rows. Add rows and face pulls to keep the shoulders balanced.`);
 if(w.unconfirmed)out.push(`${w.unconfirmed} entr${w.unconfirmed===1?'y is':'ies are'} still unconfirmed and not counted.`);
 return out;
}
function gaps(w){
 const muscles=GROUPS.filter(g=>w.exposure[g]===0),patterns=PATTERNS.filter(p=>!w.pattern[p]&&p!=='Plyometric');
 return {muscles,patterns,balance:Object.keys(BALANCE).filter(k=>!w.balance[k]&&(w.balance.pressing||!['row','rearDelt'].includes(k))).map(k=>BALANCE[k].label)};
}

// Highest confirmed load per date for movements logged at least twice. Colors follow the sorted name, not the rank.
export function liftSeries(sessions){
 const by={};
 for(const s of byDate(sessions))for(const m of s.movements.filter(m=>eligible(m)&&m.load!=null)){const e=(by[m.name]??=[]),same=e.find(x=>x.date===s.date);if(same){if(m.load>same.load)Object.assign(same,{load:m.load,section:m.section})}else e.push({date:s.date,load:m.load,section:m.section,title:s.title,id:s.id})}
 // `change` compares the latest entry with the first one from the same section (strength with strength, WOD with WOD); null when there is none yet.
 return Object.entries(by).filter(([,e])=>e.length>=2).map(([name,entries])=>{const last=entries.at(-1),base=entries.find(x=>x.section===last.section);return {name,entries,first:entries[0].load,best:Math.max(...entries.map(x=>x.load)),change:base===last?null:last.load-base.load}}).sort((a,b)=>b.entries.length-a.entries.length||a.name.localeCompare(b.name));
}
export function patternShare(sessions,from){
 const rows=sessions.filter(s=>!from||s.date>=from);
 return Object.fromEntries(PATTERNS.map(p=>[p,rows.length?rows.filter(s=>s.movements.some(m=>eligible(m)&&patternsOf(m.name).includes(p))).length/rows.length*100:0]));
}
