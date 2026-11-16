import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,scanSeed,ALL_UPDATES,WORKOUT_UPDATES,SCAN_UPDATE,october31Scans} from '../src/data.js';
import {applyWorkoutUpdate} from '../src/updates.js';
import {validateBackup,scanWarnings,lrGap} from '../src/model.js';
import {insightsPage} from '../src/insight-view.js';
const kg=x=>Math.round(x*2.20462262*10)/10;
const fit=()=>structuredClone(scanSeed.find(s=>s.id==='fitprofile-2026-10-31'));
const journal=()=>({version:1,sessions:structuredClone(seed),goals:[{id:'g',title:'Goal',done:false}],scans:structuredClone(scanSeed.slice(0,1)),checkins:[],appliedUpdates:[...WORKOUT_UPDATES]});

test('Fit Profile scan is converted from the printed kilograms and passes the composition checks',()=>{
 const s=fit();assert.equal(s.date,'2026-10-31');assert.equal(s.time,'09:49');assert.equal(s.device,'Fit Profile');
 assert.equal(s.weight,kg(78.8));assert.equal(s.bfm,kg(14.11));assert.equal(s.lbm,kg(64.69));assert.equal(s.smm,kg(37.11));assert.equal(s.tbw,kg(47.3));assert.equal(s.dlm,kg(13.08+4.33));
 assert.equal(s.pbf,17.9);assert.equal(s.bmi,25.2);assert.equal(s.bmr,1768);assert.equal(s.smi,8.7);assert.equal(s.control.fat,kg(-2.69));assert.equal(s.control.lean,0);
 assert.deepEqual(scanWarnings(s),[]);
 assert.deepEqual(Object.values(s.segments).map(x=>x.lean),[4,3.9,29.8,9.6,9.6].map(kg));assert.equal(s.segments.trunk.pct,108.8);
 assert.equal(s.extras.segFat.trunk.fat,kg(8.27));assert.equal(s.extras.segFat.trunk.pct,189.2);assert.equal(s.extras.visceral,5);assert.equal(s.extras.whr,0.93);
 assert.ok(lrGap(s.segments.leftArm.lean,s.segments.rightArm.lean)<3);assert.match(s.notes,/78\.8/);
});
test('the scan is added once to saved journals and respects deletions and existing scans',()=>{
 assert.ok(ALL_UPDATES.includes(SCAN_UPDATE));assert.equal(october31Scans.length,1);
 const next=applyWorkoutUpdate(journal());assert.equal(next.scans.length,2);assert.equal(next.sessions.length,35);assert.ok(next.appliedUpdates.includes(SCAN_UPDATE));validateBackup(next);
 assert.equal(applyWorkoutUpdate(next),next);
 const deleted={...next,scans:next.scans.slice(0,1)};assert.equal(applyWorkoutUpdate(deleted).scans.length,1,'a deleted scan stays deleted');
 const manual=journal();manual.scans.push({...fit(),id:'my-own',notes:'Typed it myself'});const kept=applyWorkoutUpdate(manual);
 assert.equal(kept.scans.length,2);assert.equal(kept.scans.find(s=>s.date==='2026-10-31').notes,'Typed it myself');
});
test('fat distribution is optional, validated, and the insights note the device change',()=>{
 const s=fit();delete s.extras;assert.doesNotThrow(()=>validateBackup({version:1,sessions:[],goals:[],scans:[s]}));
 for(const extras of [{visceral:-1},{whr:4},{segFat:{trunk:{fat:-2,pct:10}}},'x'])assert.throws(()=>validateBackup({version:1,sessions:[],goals:[],scans:[{...fit(),extras}]}));
 const html=insightsPage({sessions:seed,scans:scanSeed});
 assert.match(html,/19\.1% → 17\.9%/);assert.match(html,/different devices \(InBody 270 → Fit Profile\)/);assert.match(html,/Early signal, two devices/);assert.ok(!html.includes('Outcome not established'));
});
