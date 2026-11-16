import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed as fullSeed,scanSeed} from '../src/data.js';
import {bodyAt,sessionCalories,sessionEnergy,fuelFor,evidence,planCalories,MET,settingsOf} from '../src/energy.js';
import {weeklyReviews} from '../src/analytics.js';
import {validateBackup} from '../src/model.js';
import {validateCheckins} from '../src/checkins.js';
import {nutritionPage,fuelStrip} from '../src/nutrition-view.js';
const seed=fullSeed.filter(s=>s.date<='2026-10-31');
const journal={version:1,sessions:seed,scans:scanSeed,goals:[],checkins:[]};
const get=id=>structuredClone(seed.find(s=>s.id===id));
const today='2026-10-31';

test('body weight comes from the latest scan or check-in on or before the date, and BMR from lean mass',()=>{
 assert.equal(bodyAt(journal,'2026-10-20').lb,176.8);assert.equal(bodyAt(journal,'2026-09-21').lb,176.8,'earliest reading is used before the first scan');assert.equal(bodyAt(journal,'2026-10-31').lb,173.7);
 assert.ok(Math.abs(bodyAt(journal,'2026-10-31').bmr-1768)<5,'Katch–McArdle matches the printed BMR');
 const withCheckin={...journal,checkins:[{id:'c',date:'2026-11-02',weight:172,waist:null,chest:null,arm:null,protein:null,sleep:null,kcal:null,notes:''}]};
 assert.equal(bodyAt(withCheckin,'2026-11-03').lb,172);assert.equal(bodyAt(withCheckin,'2026-11-03').weightSource,'check-in');
});
test('session calories are active (above rest) and built from Compendium METs per part',()=>{
 const body={kg:80};const grace=sessionCalories(get('oct26'),body);
 const by=k=>grace.parts.find(p=>p.key===k);assert.equal(by('warmup').minutes,10);assert.equal(by('strength').met,MET.strength.met);assert.equal(by('wodContinuous').met,7.5);
 const expected=grace.parts.reduce((t,p)=>t+(p.met-1)*80*p.minutes/60,0);assert.equal(grace.kcal,Math.round(expected));
 assert.equal(grace.low,Math.round(grace.kcal*.75/10)*10);assert.equal(grace.high,Math.round(grace.kcal*1.25/10)*10);
 const hyrox=sessionCalories(get('oct31'),body);assert.equal(hyrox.parts.find(p=>p.key==='wodEngine').minutes,42);assert.ok(hyrox.parts.some(p=>p.key==='rope'));
 assert.equal(hyrox.parts.find(p=>p.key==='accessory').minutes,32,'4 accessories × 4 sets × 2 min');
 assert.equal(sessionCalories(get('oct17'),body).parts.find(p=>p.key==='wodContinuous').met,7.25,'EMOTM + AMRAP blends interval and continuous');
});
test('your minutes rescale the time and your RPE nudges effort within ±25%',()=>{
 const body={kg:80},base=sessionCalories(get('oct23'),body);
 const timed=sessionCalories({...get('oct23'),minutes:66},body);assert.equal(timed.minutes,66);const exact=base.parts.reduce((t,p)=>t+p.minutes,0);assert.ok(Math.abs(timed.kcal-base.kcal*66/exact)<=2);assert.equal(timed.timed,true);
 const hard=sessionCalories({...get('oct23'),rpe:10},body),easy=sessionCalories({...get('oct23'),rpe:2},body);
 assert.ok(hard.kcal>base.kcal&&hard.kcal<=base.kcal*1.25+1);assert.ok(easy.kcal<base.kcal&&easy.kcal>=base.kcal*.75-1);assert.equal(easy.rated,true);
});
test('every logged session gets an estimate; HYROX days are the biggest',()=>{
 const rows=sessionEnergy(journal);assert.equal(rows.length,seed.length);assert.ok(rows.every(r=>r.kcal>0&&r.low<r.kcal&&r.high>r.kcal));
 const top=[...rows].sort((a,b)=>b.kcal-a.kcal).slice(0,2).map(r=>r.session.id);assert.deepEqual(top,['oct31','oct24']);
});
test('daily targets: everyday + training − deficit, with more food on training days and a floor at BMR',()=>{
 const weeks=weeklyReviews(journal,{today}),f=fuelFor(journal,weeks,weeks.length-1);
 assert.equal(f.forWeek,'2026-11-02');assert.equal(f.settings.activity,'light');assert.ok(Math.abs(f.everyday-f.body.bmr*1.35)<1);
 assert.ok(Math.abs(f.deficit-173.7*.005*3500/7)<1);assert.ok(f.target.training>f.target.rest);
 assert.ok(Math.abs(f.maintenance.average-(f.everyday+f.weeklyTraining/7))<1);assert.ok(Math.abs(f.target.rest-(f.maintenance.rest-f.deficit))<1);
 assert.ok(f.target.training>2100&&f.target.training<2400&&f.target.rest>1850&&f.target.rest<2050,'about 2,250 / 1,950 for this log');
 assert.equal(f.plan.kcal,planCalories(weeks.at(-1).plan,f.body).kcal);
 const pLow=f.macros.proteinRange.low,pHigh=f.macros.proteinRange.high;assert.ok(f.macros.protein>=pLow&&f.macros.protein<=pHigh);
 const sitting=fuelFor({...journal,nutrition:{activity:'sitting',pace:'faster'}},weeks,weeks.length-1);
 assert.ok(sitting.target.rest<f.target.rest);assert.ok(sitting.target.rest>=sitting.body.bmr-1,'never below resting energy');
});
test('evidence reads the scan trend and only calibrates with enough logged intake and weights',()=>{
 const ev=evidence(journal,today);assert.ok(ev.scanRate.lbPerWeek<-0.8&&ev.scanRate.lbPerWeek>-0.9);assert.equal(ev.scanRate.mixed,true);assert.equal(ev.calibrated,null);
 const days=Array.from({length:14},(_,i)=>`2026-11-${String(i+1).padStart(2,'0')}`);
 const checkins=days.map((d,i)=>({id:d,date:d,weight:i<7?174:173,waist:null,chest:null,arm:null,protein:null,sleep:null,kcal:2200,notes:''}));
 const cal=evidence({...journal,checkins},'2026-11-14');assert.equal(cal.intakeCount,14);assert.equal(cal.calibrated,2200+500,'1 lb/week down at 2,200 kcal implies ~2,700 maintenance');
});
test('settings and calories eaten are optional, validated and kept in backups',()=>{
 assert.deepEqual(settingsOf({}),{activity:'light',pace:'steady'});
 assert.equal(validateBackup({...journal,nutrition:{activity:'active',pace:'gentle'}}).nutrition.pace,'gentle');
 assert.throws(()=>validateBackup({...journal,nutrition:{activity:'couch',pace:'steady'}}));
 const old={id:'a',date:'2026-10-18',weight:176,waist:null,chest:null,arm:null,protein:null,sleep:null,notes:''};
 assert.doesNotThrow(()=>validateCheckins([old]),'check-ins saved before the calories field stay valid');
 assert.throws(()=>validateCheckins([{...old,kcal:-5}]));assert.doesNotThrow(()=>validateCheckins([{...old,kcal:2300}]));
});
test('nutrition page and weekly fuel strip render every session and escape titles',()=>{
 const j=structuredClone(journal);j.sessions.find(s=>s.id==='oct30').title='<img src=x>';
 const html=nutritionPage(j,{today});assert.ok(!html.includes('<img src=x>'));assert.match(html,/Eat about 2,\d50 on training days and 1,\d50 on rest days/);
 assert.equal((html.match(/data-edit="/g)||[]).length,seed.length);assert.match(html,/02040/);assert.match(html,/Helms/);
 const weeks=weeklyReviews(journal,{today});assert.match(fuelStrip(fuelFor(journal,weeks,weeks.length-1)),/Fuel for the week of Nov 2/);
 assert.match(nutritionPage({sessions:[]}),/No workouts yet/);
});
