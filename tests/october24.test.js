import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,scanSeed,WORKOUT_UPDATES,october24Workouts,latestWorkouts} from '../src/data.js';
import {applyWorkoutUpdate} from '../src/updates.js';
import {analyze} from '../src/insight-model.js';
import {insightsPage} from '../src/insight-view.js';
import {validateBackup,history} from '../src/model.js';
const upTo24=seed.filter(s=>s.date<='2026-10-24');
const oldJournal=()=>({version:1,sessions:structuredClone(seed.filter(s=>s.date<='2026-10-17')),goals:[{id:'g',title:'Keep goal',done:false}],scans:structuredClone(scanSeed),checkins:[{id:'c',date:'2026-10-18',weight:176,waist:null,chest:null,arm:null,protein:null,sleep:null,notes:'Keep measurement'}],appliedUpdates:WORKOUT_UPDATES.filter(x=>x!=='workouts-through-2026-10-24')});
test('October 24 batch adds only five dates and preserves existing edits, deletions, scans and check-ins',()=>{
 const old=oldJournal();old.sessions=old.sessions.filter(s=>s.id!=='oct17');old.sessions[0].notes='Personal note';
 const next=applyWorkoutUpdate(old);assert.equal(next.sessions.length,21);assert.equal(next.sessions[0].notes,'Personal note');assert.equal(next.sessions.some(s=>s.id==='oct17'),false);
 assert.deepEqual(next.checkins,old.checkins);assert.deepEqual(next.scans,old.scans);assert.deepEqual(next.goals,old.goals);assert.equal(applyWorkoutUpdate(next),next);validateBackup(next);
 assert.equal(latestWorkouts.length,8);assert.deepEqual(october24Workouts.map(s=>s.date),['2026-10-19','2026-10-20','2026-10-21','2026-10-23','2026-10-24']);
 next.sessions=next.sessions.filter(s=>s.id!=='oct24');assert.equal(applyWorkoutUpdate(next).sessions.length,20);
});
test('manual entries for new dates are not overwritten or duplicated',()=>{
 const old=oldJournal();old.sessions.push({...structuredClone(october24Workouts[0]),id:'manual',title:'My press day',notes:'Keep my details'});
 const next=applyWorkoutUpdate(old);assert.equal(next.sessions.length,22);assert.equal(next.sessions.find(s=>s.id==='manual').notes,'Keep my details');assert.equal(next.sessions.some(s=>s.id==='oct19'),false);
});
test('new accessories contribute to goal coverage without invented working sets',()=>{
 const a=analyze({sessions:upTo24,scans:scanSeed});assert.equal(a.sessions.length,22);assert.equal(a.days,34);assert.deepEqual(a.weeks.map(w=>w.sessions.length),[3,5,5,4,5]);assert.deepEqual(a.targets.map(t=>t.count),[4,2,1,1]);assert.equal(a.effortEntries,0);
 for(const t of a.targets.slice(0,3)){assert.ok(t.entries.some(x=>x.session.id==='oct24'));assert.equal(t.qualifiedSets,0)}assert.equal(a.targets[3].entries[0].session.id,'oct13');
 const extras=seed.find(s=>s.id==='oct24').movements.filter(m=>m.section==='Extra');assert.deepEqual(extras.map(m=>m.result),['30 reps total; 25 lb DB','40 reps total; 25 lb DB','40 reps total; 25 lb']);assert.ok(extras.every(m=>m.sets.length===0));
 assert.equal(analyze({sessions:upTo24},'28').sessions.length,19);
 const html=insightsPage({sessions:upTo24,scans:scanSeed});assert.ok(html.includes('4 focused sessions'));assert.ok(html.includes('2 biceps · 1 triceps'));assert.ok(html.includes('Front Squat'));assert.ok(html.includes('Deadlift'));
});
test('scores, substitutions and reported maxes preserve source uncertainty',()=>{
 const get=id=>seed.find(s=>s.id===id);assert.equal(get('oct19').score,'1 round');assert.equal(get('oct20').score,'3 rounds + 6 reps');assert.equal(get('oct21').score,'~14:34');assert.equal(get('oct23').score,'11:26');assert.equal(get('oct24').score,'44:54');
 assert.equal(get('oct21').movements.find(m=>m.section==='WOD'&&m.name==='Deadlift').sets.length,0);assert.match(get('oct21').notes,/135 lb/);
 assert.equal(get('oct20').movements.find(m=>m.name==='Ring Muscle-up').status,'skipped');assert.equal(get('oct20').movements.find(m=>m.name==='Jumping Pull-up').status,'confirmed');
 assert.equal(history(upTo24,'Press').at(-1).load,120);assert.equal(history(upTo24,'Deadlift').at(-1).load,120);assert.equal(history(upTo24,'Front Squat').at(-1).load,105);assert.deepEqual(get('oct24').movements.find(m=>m.name==='Human Maker').groups,[]);
 validateBackup({version:1,sessions:seed,goals:[],scans:scanSeed});
});
