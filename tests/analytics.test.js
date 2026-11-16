import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,scanSeed} from '../src/data.js';
import {estimateDemand,sessionStats,weeklyReviews,patternsOf,liftSeries,sessionExposure,weightFor} from '../src/analytics.js';
import {dashboard,weeklyPage,rankingsPage,sessionReport} from '../src/analytics-view.js';
import {validateBackup} from '../src/model.js';
const get=id=>structuredClone(seed.find(s=>s.id===id));
// These cases were written against the log through Oct 24; tests/october31.test.js covers the later batch.
const upTo24=seed.filter(s=>s.date<='2026-10-24');
const journal={version:1,sessions:upTo24,scans:scanSeed,goals:[]};
const today='2026-10-24';

test('session minutes come from the score, then the format, then a labeled default',()=>{
 const wod=id=>estimateDemand(get(id)).parts.find(p=>p.section==='WOD');
 assert.equal(Math.round(wod('oct13').minutes*60),17*60+10);assert.equal(wod('oct13').source,'score');
 assert.equal(wod('sep25').minutes,15);assert.equal(wod('sep25').source,'format');
 assert.equal(wod('oct19').minutes,12+2*4.5);assert.equal(wod('oct17').minutes,40);assert.equal(wod('oct17').intensity,7.5);
 assert.equal(wod('sep24').source,'assumed');assert.equal(Math.round(wod('oct21').minutes*100),1457);
 assert.equal(estimateDemand(get('oct24')).parts.find(p=>p.section==='Extra').minutes,15);
});
test('recorded RPE and minutes replace the estimate with session-RPE load',()=>{
 const s=get('oct23');assert.equal(estimateDemand(s).estimated,true);
 s.rpe=8;s.minutes=50;const d=estimateDemand(s);assert.equal(d.points,400);assert.equal(d.rated,true);assert.equal(d.intensity,8);
 const t=get('oct23');t.minutes=60;assert.equal(estimateDemand(t).minutes,60);assert.equal(estimateDemand(t).rated,false);
});
test('rankings order sessions and compare each one with its own earlier baseline',()=>{
 const rows=sessionStats(upTo24),by=id=>rows.find(r=>r.session.id===id);
 assert.equal(by('oct24').rank,1);assert.equal(by('sep25').rank,rows.length);assert.equal(new Set(rows.map(r=>r.rank)).size,rows.length);
 assert.equal(by('sep21').ratio,null);assert.equal(by('sep25').ratio,null);assert.match(by('sep25').verdict,/Building a baseline/);assert.ok(by('oct24').ratio>1.25);
 assert.deepEqual(by('oct19').loads.find(l=>l.name==='Press'),{name:'Press',section:'Strength',load:120,best:85,status:'best'});
 assert.equal(by('oct15').loads.find(l=>l.name==='Deadlift').status,'below');
 assert.equal(by('oct21').loads.find(l=>l.section==='Strength').status,'first');
});
test('exposure weights direct, primary and secondary roles and caps each session',()=>{
 const crucifix=get('oct24').movements.find(m=>m.name==='Chest Crucifix'),pull=get('sep28').movements.find(m=>m.name==='DB Front Squat');
 assert.equal(weightFor(crucifix,'Chest'),2);assert.equal(weightFor(pull,'Quads'),1);assert.equal(weightFor(pull,'Core'),.5);
 const s=get('oct24');s.movements=Array.from({length:4},()=>({...crucifix}));assert.equal(sessionExposure(s).points.Chest,3);
 const unconfirmed=get('oct24');unconfirmed.movements.forEach(m=>m.status='unconfirmed');assert.equal(sessionExposure(unconfirmed).points.Chest,0);
});
test('weekly reviews cover every week, judge priorities and build a next-week plan',()=>{
 const weeks=weeklyReviews(journal,{today});
 assert.deepEqual(weeks.map(w=>w.start),['2026-09-21','2026-09-28','2026-10-05','2026-10-12','2026-10-19']);
 assert.deepEqual(weeks.map(w=>w.sessions.length),[3,5,5,4,5]);assert.equal(weeks.at(-1).inProgress,true);assert.equal(weeks[0].inProgress,false);
 assert.equal(weeks[0].acwr,null);assert.equal(weeks[1].acwr,null);assert.ok(weeks[2].acwr>1);
 const oct12=weeks[3],oct19=weeks[4],p=(w,g)=>w.priority.find(x=>x.muscle===g);
 assert.equal(p(oct12,'Biceps').status,'missed');assert.ok(oct12.gaps.muscles.includes('Biceps'));
 assert.equal(p(oct19,'Glutes').status,'met');assert.equal(p(oct19,'Chest').status,'partial');assert.equal(p(oct19,'Chest').sessionsDirect,1);
 assert.equal(oct19.plan.forWeek,'2026-10-26');
 assert.deepEqual(oct19.plan.blocks.A.map(i=>i.name),['Low-to-high Cable Fly','Mid Cable Fly','Incline DB Curl','Overhead Cable Extension']);
 assert.deepEqual(oct19.plan.blocks.B.map(i=>i.name),['Incline DB Press','High-to-low Cable Fly','Bayesian Cable Curl','Tricep Rope Pushdown']);
 assert.equal(oct12.plan.blocks.B.find(i=>i.muscle==='Biceps').name,'Hammer Curl','B-day curl alternates by week');
 assert.ok(oct19.plan.items.every(i=>i.prescription.startsWith('2 ×')),'sets trimmed after a load spike');
 assert.equal(oct19.plan.items.find(i=>i.name==='Tricep Rope Pushdown').last.load,25);
 const twoBiceps=oct12.plan.items.filter(i=>i.muscle==='Biceps');assert.equal(twoBiceps.length,2);
 assert.notEqual(oct12.plan.blocks.A.some(i=>i.muscle==='Biceps'),false);assert.ok(oct12.plan.blocks.B.some(i=>i.muscle==='Biceps'),'same muscle is split across both days');
 for(const g of ['Chest','Biceps','Triceps'])for(const w of weeks)assert.ok(w.plan.blocks.A.some(i=>i.muscle===g)&&w.plan.blocks.B.some(i=>i.muscle===g),'each priority muscle on both days');
 for(const w of weeks){assert.ok(w.plan.items.length<=10);assert.ok(w.score>=0&&w.score<=100);assert.ok(['Strong','Solid','Uneven','Light'].includes(w.grade))}
 assert.equal(weeks[0].followThrough,null);assert.equal(oct19.followThrough.total,oct12.plan.items.length);
 assert.deepEqual(weeklyReviews({sessions:[]}),[]);
});
test('a later edit cannot leak future data into an earlier week plan',()=>{
 const j=structuredClone(journal),weeks=weeklyReviews(j,{today}),plan=weeks[0].plan;
 assert.ok(plan.items.every(i=>!i.last||i.last.date<=weeks[0].end));
});
test('movement patterns resolve ambiguous names',()=>{
 assert.deepEqual(patternsOf('Bench Press'),['Horizontal push']);assert.deepEqual(patternsOf('Deficit Handstand Push-up'),['Vertical push']);
 assert.deepEqual(patternsOf('Row'),['Engine']);assert.deepEqual(patternsOf('Pendlay Row'),['Pull']);assert.deepEqual(patternsOf('Bulgarian Split Squat'),['Lunge']);
 assert.deepEqual(patternsOf('Back Extension'),['Hinge']);assert.deepEqual(patternsOf('Tricep Rope Pushdown'),['Arm isolation']);assert.deepEqual(patternsOf('Overhead Cable Extension'),['Arm isolation']);assert.deepEqual(patternsOf('Low-to-high Cable Fly'),['Horizontal push']);assert.deepEqual(patternsOf('Thruster'),['Vertical push','Squat']);
 assert.deepEqual(liftSeries(upTo24).find(l=>l.name==='Press').entries.map(e=>e.load),[85,120]);
});
test('session RPE and minutes are optional, bounded and kept in backups',()=>{
 const j=structuredClone(journal);j.sessions[0].rpe=7.5;j.sessions[0].minutes=55;assert.equal(validateBackup(j).sessions[0].rpe,7.5);
 j.sessions[0].rpe=null;j.sessions[0].minutes=null;assert.doesNotThrow(()=>validateBackup(j));
 j.sessions[0].rpe=11;assert.throws(()=>validateBackup(j),/RPE/);j.sessions[0].rpe=0.5;assert.throws(()=>validateBackup(j),/RPE/);
 j.sessions[0].rpe=null;j.sessions[0].minutes=0;assert.throws(()=>validateBackup(j),/minutes/);
});
test('analytics pages escape journal text and handle empty journals',()=>{
 const j=structuredClone(journal);j.sessions.find(s=>s.id==='oct24').title='<img src=x onerror=alert(1)>';j.sessions.find(s=>s.id==='oct24').movements[6].name='"><script>x</script>';
 for(const html of [dashboard(j,{today}),weeklyPage(j,{today}),rankingsPage(j,{today}),rankingsPage(j,{today,sort:'intensity'})]){assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('<script>x'));}
 assert.ok(dashboard(j,{today}).includes('&lt;img src=x'));
 assert.match(dashboard({sessions:[]}),/No workouts yet/);assert.match(weeklyPage({sessions:[]}),/No weeks/);assert.match(rankingsPage({sessions:[]}),/No sessions/);assert.equal(sessionReport(null),'');
 const html=weeklyPage(journal,{today});assert.match(html,/Suggested for the week of Oct 26/);assert.match(html,/hindsight/);
 assert.match(rankingsPage(journal,{today}),/Soul Crushing Saturday/);
});
