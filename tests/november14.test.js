import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,scanSeed,ALL_UPDATES,WORKOUT_UPDATE,november14Workouts as batch} from '../src/data.js';
import {applyWorkoutUpdate} from '../src/updates.js';
import {validateBackup} from '../src/model.js';
import {analyze} from '../src/insight-model.js';
import {estimateDemand} from '../src/analytics.js';
test('November update preserves saved journal and imports each missing session once',()=>{
 const manual={...structuredClone(batch[0]),id:'custom',notes:'My log'};
 const old={version:1,sessions:[...seed.slice(1,27),manual],checkins:[],goals:[],scans:scanSeed,appliedUpdates:ALL_UPDATES.filter(x=>x!==WORKOUT_UPDATE)};
 const next=applyWorkoutUpdate(old);assert.equal(next.sessions.length,34);assert.equal(next.sessions.find(s=>s.id==='custom').notes,'My log');assert.equal(next.scans,old.scans);assert.equal(next.checkins,old.checkins);assert.equal(applyWorkoutUpdate(next),next);validateBackup(next);
 assert.deepEqual(batch.map(s=>s.date.slice(-2)),['02','05','09','10','11','12','13','14']);
});
test('relay cap, accessory work and disputed scores retain their meaning',()=>{
 const relay=batch.at(-1);assert.match(relay.score,/45:00.*cap/);assert.match(relay.notes,/unconfirmed/);assert.ok(relay.movements.filter(m=>m.section==='WOD'&&m.name!=='Power Clean').every(m=>m.status==='unconfirmed'));
 assert.deepEqual(relay.movements.filter(m=>m.section==='Extra').map(m=>[m.sets.length,m.sets[0].reps,m.load]),[[4,12,35],[4,12,30],[4,12,30],[4,12,35],[3,12,60]]);
 const a=analyze({sessions:[relay]});assert.deepEqual(a.targets.slice(1,3).map(t=>t.entries.length),[3,2]);assert.equal(a.effortEntries,0);
 assert.equal(batch[3].movements.find(m=>m.name==='Double-under').status,'skipped');assert.equal(batch[5].score,'1+9 / 1+9 / 1+9 / 1+15');assert.equal(estimateDemand(batch[5]).parts[0].minutes,12);assert.match(batch[6].notes,/3\+11/);assert.match(batch[6].score,/13 reps/);
});
test('every imported movement has an explicit mapping decision; missing saved incline mappings are repaired once',async()=>{
 const {MAP,MUSCLE_UPDATE}=await import('../src/data.js');
 for(const s of seed)for(const m of s.movements)assert.ok(Object.hasOwn(MAP,m.name),s.date+': '+m.name);
 const sessions=structuredClone(batch);
 const incline=id=>sessions.find(s=>s.id===id).movements.find(m=>m.name==='Incline Bench Press');
 incline('nov05').groups=[];incline('nov12').groups=['Chest'];
 const fixed=applyWorkoutUpdate({sessions,appliedUpdates:ALL_UPDATES.filter(k=>k!==MUSCLE_UPDATE)});
 assert.deepEqual(fixed.sessions.find(s=>s.id==='nov05').movements.find(m=>m.name==='Incline Bench Press').groups,['Chest','Shoulders','Triceps']);
 assert.deepEqual(fixed.sessions.find(s=>s.id==='nov12').movements.find(m=>m.name==='Incline Bench Press').groups,['Chest']);assert.equal(applyWorkoutUpdate(fixed),fixed);
});
