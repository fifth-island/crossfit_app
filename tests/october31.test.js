import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed as fullSeed,scanSeed,WORKOUT_UPDATES,october31Workouts} from '../src/data.js';
import {applyWorkoutUpdate} from '../src/updates.js';
import {validateBackup,history} from '../src/model.js';
import {sessionStats,weeklyReviews,liftSeries,estimateDemand} from '../src/analytics.js';
import {weeklyPage,dashboard} from '../src/analytics-view.js';
const seed=fullSeed.filter(s=>s.date<='2026-10-31');
const get=id=>seed.find(s=>s.id===id);
const through24=()=>({version:1,sessions:structuredClone(seed.filter(s=>s.date<='2026-10-24')),goals:[{id:'g',title:'Keep goal',done:false}],scans:structuredClone(scanSeed),checkins:[{id:'c',date:'2026-10-25',weight:175,waist:null,chest:null,arm:null,protein:null,sleep:null,notes:''}],appliedUpdates:WORKOUT_UPDATES.filter(x=>x!=='workouts-through-2026-10-31')});

test('October 31 batch adds five sessions once and keeps edits, deletions, goals, scans and check-ins',()=>{
 assert.deepEqual(october31Workouts.map(s=>s.date),['2026-10-26','2026-10-27','2026-10-28','2026-10-30','2026-10-31']);
 const old=through24();old.sessions[0].notes='Personal note';old.sessions=old.sessions.filter(s=>s.id!=='oct23');
 const next=applyWorkoutUpdate(old);assert.equal(next.sessions.length,26);assert.equal(next.sessions[0].notes,'Personal note');assert.equal(next.sessions.some(s=>s.id==='oct23'),false);
 assert.deepEqual(next.goals,old.goals);assert.deepEqual(next.scans,old.scans);assert.deepEqual(next.checkins,old.checkins);assert.equal(applyWorkoutUpdate(next),next);validateBackup(next);
 next.sessions=next.sessions.filter(s=>s.id!=='oct31');assert.equal(applyWorkoutUpdate(next).sessions.length,25,'a deleted import stays deleted');
});
test('a session already logged by hand for the same day and lift is not duplicated',()=>{
 const old=through24();old.sessions.push({...structuredClone(get('oct28')),id:'manual-helen',title:'My Helen',notes:'Mine'});
 const next=applyWorkoutUpdate(old);assert.equal(next.sessions.filter(s=>s.date==='2026-10-28').length,1);assert.equal(next.sessions.find(s=>s.date==='2026-10-28').notes,'Mine');
});
test('new sessions keep reported numbers and leave unclear loads in the text',()=>{
 assert.equal(get('oct26').score,'7:18');assert.equal(get('oct27').score,'18:21');assert.equal(get('oct28').score,'14:46');assert.equal(get('oct30').score,'9:15');
 assert.equal(history(seed,'Back Squat').at(-1).load,145);assert.equal(history(seed,'Bench Press').at(-1).load,165);assert.equal(history(seed,'Jerk').at(-1).load,130);assert.equal(history(seed,'Clean').find(r=>r.section==='Strength').load,105);
 const nancy=get('oct27').movements.find(m=>m.name==='Overhead Squat'&&m.section==='WOD');assert.equal(nancy.load,null);assert.match(nancy.result,/65 lb DBs/);
 const flies=get('oct30').movements.filter(m=>/Cable Fly/.test(m.name));assert.deepEqual(flies.map(m=>m.name),['Low-to-high Cable Fly','Mid Cable Fly','High-to-low Cable Fly']);assert.ok(flies.every(m=>m.load===null&&/per side/.test(m.result)));
 assert.equal(get('oct28').movements.find(m=>m.name==='Bicep Curls').load,null);assert.equal(get('oct28').movements.find(m=>m.name==='Tricep Rope Pushdown').sets.length,4);
 const hyrox=get('oct31');assert.equal(hyrox.movements.find(m=>m.name==='Deadlift').load,145);assert.equal(hyrox.movements.find(m=>m.name==='Wall Ball').load,null);assert.match(hyrox.notes,/120 lb 1RM/);
 assert.equal(estimateDemand(hyrox).parts.find(p=>p.section==='WOD').minutes,42,'3 × 14-minute AMRAPs; separate scores are not read as a time');
 assert.equal(get('oct31').movements.filter(m=>m.name==='Single-under').length,1);
});
test('loads, rankings and the first live weekly plan follow-through',()=>{
 const rows=sessionStats(seed),by=id=>rows.find(r=>r.session.id===id);
 assert.equal(by('oct31').rank,1);assert.equal(by('oct28').loads.find(l=>l.name==='Bench Press').status,'best');assert.equal(by('oct31').loads.find(l=>l.name==='Deadlift').best,135);
 const weeks=weeklyReviews({sessions:seed},{today:'2026-10-31'}),w=weeks.at(-1);
 assert.equal(w.start,'2026-10-26');assert.equal(w.inProgress,true);assert.equal(w.sessions.length,5);
 assert.deepEqual(w.priority.map(p=>p.status),['met','met','met','met']);
 const ft=w.followThrough;assert.equal(ft.total,8);assert.equal(ft.items.filter(i=>i.exact).length,5);assert.equal(ft.covered,8);
 assert.equal(w.wins.filter(x=>x.startsWith('Heaviest logged')).length,1,'load records are merged into one line');
 assert.match(w.wins.find(x=>x.startsWith('Heaviest logged')),/Tricep Rope Pushdown \(Extra\) 35 lb, up from 25 lb/);
 const plan=w.plan;assert.equal(plan.forWeek,'2026-11-02');assert.ok(w.acwr>1.3&&w.acwr<=1.5);assert.ok(plan.items.some(i=>i.prescription.startsWith('3 ×')),'no trim below ×1.5');
 assert.match(plan.notes.join(' '),/Keep three sets/);
 const ext=plan.items.find(i=>i.name==='Overhead Cable Extension');assert.equal(ext.last.name,'Overhead Triceps Extension');
 const fly=plan.items.find(i=>i.name==='Low-to-high Cable Fly');assert.equal(fly.last.load,null);assert.match(fly.last.result,/10 lb per side/);
 assert.match(weeklyPage({sessions:seed},{today:'2026-10-31'}),/Last \(Overhead Triceps Extension\)/);
});
test('lift progression renders one small chart per lift',()=>{
 const lifts=liftSeries(seed);assert.ok(lifts.length>6);assert.equal(lifts.find(l=>l.name==='Back Squat').change,40);assert.equal(lifts.find(l=>l.name==='Clean').change,null,'1RM vs WOD load is not a like-for-like change');
 const html=dashboard({sessions:seed},{today:'2026-10-31'});assert.equal((html.match(/class="lift-mini"/g)||[]).length,lifts.length);assert.ok(!html.includes('data-lift='));
});
test('balance rule adds rows, face pulls, core and hamstring curls when the week lacks them',async()=>{
 const {balanceOf,BALANCE,patternsOf}=await import('../src/analytics.js');
 assert.equal(BALANCE.row.test('Seated Cable Row'),true);assert.equal(BALANCE.row.test('Row'),false,'the rowing machine is cardio, not a row');assert.equal(BALANCE.row.test('Row/Ski Buy-in'),false);
 assert.deepEqual(patternsOf('Hanging Knee Raise'),['Core']);assert.deepEqual(patternsOf('Nordic Curl'),[]);assert.deepEqual(patternsOf('Hamstring Curl'),[]);
 const weeks=weeklyReviews({sessions:seed},{today:'2026-10-31'}),w=weeks.at(-1);
 assert.deepEqual(balanceOf(w.sessions),{row:false,rearDelt:false,core:false,kneeFlexion:false,pressing:4});assert.equal(w.gaps.balance.length,4);
 assert.ok(w.improve.some(x=>/no rows/.test(x)));
 const kinds=k=>w.plan.items.filter(i=>i.kind===k);
 assert.equal(kinds('row')[0].name,'Single Arm DB Row');assert.match(kinds('row')[0].last.result,/40 lb/);
 assert.deepEqual(w.plan.blocks.A.filter(i=>i.kind==='rearDelt').length+w.plan.blocks.B.filter(i=>i.kind==='rearDelt').length,2,'face pulls on both days');
 assert.equal(kinds('core').length,1);assert.equal(kinds('kneeFlexion')[0].name,'Hamstring Curl');
 assert.ok(!w.plan.notes.some(n=>/Core|Shoulders/.test(n)&&/adds none/.test(n)),'no contradiction with added core and face pulls');
 assert.ok(weeks.at(-2).plan.items.every(i=>!i.kind),'the plan already shown for Oct 26 is unchanged');assert.equal(w.followThrough.total,8);
});
test('balance work drops out once it is done in a week',()=>{
 const done={id:'acc',date:'2026-10-29',title:'Back & core',format:'Accessory',score:'',notes:'',movements:['Seated Cable Row','Face Pull','Plank','Hamstring Curl'].map(name=>({id:name,name,section:'Extra',prescription:'',result:'3×12',status:'confirmed',load:null,sets:[],groups:[]}))};
 const w=weeklyReviews({sessions:[...seed,done]},{today:'2026-10-31'}).at(-1);
 assert.deepEqual(w.gaps.balance,[]);assert.ok(w.plan.items.every(i=>!i.kind));assert.ok(!w.improve.some(x=>/no rows/.test(x)));
 const next=weeklyReviews({sessions:[...seed,done,{...structuredClone(done),id:'later',date:'2026-11-03',movements:done.movements.slice(0,1)}]},{today:'2026-11-03'}).at(-1);
 const ft=next.followThrough.items;assert.equal(ft.find(i=>i.kind==='row'),undefined,'nothing to follow through when no balance items were planned');
});
test('a week that skips the planned row is not credited by pull-ups alone',()=>{
 const pullups={id:'p',date:'2026-11-03',title:'Pull day',format:'For time',score:'5:00',notes:'',movements:[{id:'x',name:'Pull-up',section:'WOD',prescription:'',result:'50 reps',status:'confirmed',load:null,sets:[],groups:['Lats','Upper back','Biceps','Core']}]};
 const w=weeklyReviews({sessions:[...seed,pullups]},{today:'2026-11-03'}).at(-1);
 const row=w.followThrough.items.find(i=>i.kind==='row');assert.equal(row.covered,false);assert.equal(w.followThrough.items.filter(i=>i.name==='Face Pull').length,1,'face pulls listed once');
});
