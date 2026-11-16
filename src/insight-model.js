import {weekStart,shift,scanTime} from './model.js';
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const names=list=>new Set(list.map(norm));
export const TARGETS=[
 {id:'chest',label:'Chest-focused press / dip / fly',muscle:'Chest',names:names(['Bench Press','DB Bench Press','Incline DB Press','Incline Bench Press','DB Floor Press','Ring Dip','Chest Fly','Chest Crucifix','Push-up','Cable Fly','Low-to-high Cable Fly','Mid Cable Fly','High-to-low Cable Fly','Upper Cable Fly','Lower Cable Fly','Hand Release Push-up'])},
 {id:'biceps',label:'Isolated biceps work',muscle:'Biceps',names:names(['DB Seated Hammer Curl','DB Curl','Biceps Curl','Bicep Curls','Hammer Curl','Barbell Curl','Incline DB Curl','Bayesian Cable Curl','Cable Curl','Short-Bar Cable Biceps Curl','Preacher Curl'])},
 {id:'triceps',label:'Isolated triceps work',muscle:'Triceps',names:names(['Triceps Extension','Triceps Pushdown','Tricep Rope Pushdown','Overhead Triceps Extension','Skull Crusher','DB Triceps Kickback','Overhead Cable Extension','Overhead EZ-Bar Triceps Extension'])},
 {id:'glutes',label:'Glute-focused hinge / thrust / split squat',muscle:'Glutes',names:names(['Hip Thrust','Barbell Hip Thrust','Glute Bridge','Single-leg Glute Bridge','Romanian Deadlift','DB Romanian Deadlift','Bulgarian Split Squat','Step-up','Sandbag Box Step-up','Kettlebell Swing','Cable Kickback','Ukrainian KB Swing','American KB Swing'])}
];
const eligible=m=>m.status==='confirmed'&&m.section!=='Warm-up';
// Read actual results only. Per-side and changing loads can still document a set count.
export function accessorySets(m){
 if(m.section!=='Extra'||m.status!=='confirmed')return 0;
 if(m.sets?.length)return m.sets.filter(x=>x.reps>0).length;
 const explicit=/^\s*(\d{1,2})\s*[×x]\s*([1-9]\d*)\s+at\s+\d/i.exec(m.result||'');
 return explicit?Number(explicit[1]):0;
}
const dateMS=date=>Date.parse(date+'T00:00:00Z');
export const daysBetween=(a,b)=>Math.round((dateMS(b)-dateMS(a))/86400000);
export function analyze(journal,range='all'){
 const all=[...journal.sessions].sort((a,b)=>a.date.localeCompare(b.date)),end=all.at(-1)?.date;
 const start=all.length?(range==='28'?shift(end,-27):all[0].date):null;
 const sessions=all.filter(s=>s.date>=start),weeks=[];
 if(start)for(let w=weekStart(start);w<=end;w=shift(w,7))weeks.push({start:w,sessions:sessions.filter(s=>s.date>=w&&s.date<=shift(w,6)),partial:w<start||shift(w,6)>end});
 const targetStats=TARGETS.map(t=>{
  const entries=sessions.flatMap(s=>s.movements.filter(m=>eligible(m)&&t.names.has(norm(m.name))).map(m=>({session:s,movement:m})));
  const support=sessions.filter(s=>s.movements.some(m=>eligible(m)&&m.groups.includes(t.muscle)&&!t.names.has(norm(m.name))));
  return {...t,entries,accessorySets:entries.reduce((n,x)=>n+accessorySets(x.movement),0),count:new Set(entries.map(x=>x.session.id)).size,support:support.length,weekly:weeks.map(w=>entries.filter(x=>w.sessions.some(s=>s.id===x.session.id))),qualifiedSets:entries.reduce((n,{movement:m})=>n+(m.rir!=null&&m.rir<=3?m.sets.filter(s=>s.reps>0).length:0),0)};
 });
 const dates=[...new Set(sessions.map(s=>s.date))];let streak=0,longest=0;
 dates.forEach((d,i)=>{streak=i&&daysBetween(dates[i-1],d)===1?streak+1:1;longest=Math.max(longest,streak)});
 const records=sessions.flatMap(s=>s.movements.filter(eligible).map(m=>({session:s,movement:m})));
 const loads=records.filter(x=>x.movement.section==='Strength'&&x.movement.load!=null);
 const strengthNames=[...new Set(loads.map(x=>x.movement.name))];
 const strength=strengthNames.map(name=>({name,entries:loads.filter(x=>x.movement.name===name)}));
 const scans=[...(journal.scans||[])].sort((a,b)=>scanTime(a)-scanTime(b));
 const checkins=[...(journal.checkins||[])].sort((a,b)=>a.date.localeCompare(b.date));
 const bodyFat=scans.filter(s=>s.pbf!=null),latest=scans.at(-1),kg=latest?.weight?latest.weight*.45359237:null;
 return {start,end,sessions,weeks,days:start?daysBetween(start,end)+1:0,avg:weeks.length?sessions.length/weeks.length:0,targets:targetStats,longest,strength,scans,bodyFat,latest,kg,checkins,unknown:sessions.flatMap(s=>s.movements).filter(m=>m.status==='unconfirmed'&&m.section!=='Warm-up').length,effortEntries:records.filter(x=>x.movement.rir!=null&&x.movement.sets.length).length};
}
export function checkinTrend(checkins,key){const entries=checkins.filter(c=>c[key]!=null).sort((a,b)=>a.date.localeCompare(b.date));const first=entries[0],last=entries.at(-1);return {first,last,count:entries.length,delta:entries.length>1?last[key]-first[key]:null}}
export function weightAverages(checkins){const entries=checkins.filter(c=>c.weight!=null).sort((a,b)=>a.date.localeCompare(b.date));if(!entries.length)return null;const end=entries.at(-1).date,recent=entries.filter(c=>c.date>=shift(end,-6)),previous=entries.filter(c=>c.date>=shift(end,-13)&&c.date<shift(end,-6));const mean=a=>a.reduce((n,c)=>n+c.weight,0)/a.length;return {end,recentCount:recent.length,previousCount:previous.length,recent:mean(recent),previous:previous.length?mean(previous):null,delta:recent.length>=3&&previous.length>=3?mean(recent)-mean(previous):null}}
