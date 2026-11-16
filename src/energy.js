import {estimateDemand,patternsOf} from './analytics.js';
import {scanTime,shift} from './model.js';
import {weightAverages} from './insight-model.js';
// Calorie estimates. Exercise uses MET values from the 2024 Adult Compendium of Physical Activities and reports
// active calories (above resting), so they add to resting and everyday energy without double counting.
const LB=2.20462262;
export const MET={
 warmup:{met:3.0,code:'02056',label:'Warm-up and mobility'},
 wodContinuous:{met:7.5,code:'02040',label:'AMRAP / for-time WOD'},
 wodInterval:{met:7.0,code:'02210',label:'EMOM / interval WOD'},
 wodEngine:{met:8.5,code:'12030',label:'Run-heavy WOD or HYROX'},
 strength:{met:5.0,code:'02052',label:'Barbell strength block'},
 skill:{met:3.0,code:'02056',label:'Skill practice'},
 accessory:{met:3.5,code:'02054',label:'Accessory sets'},
 rope:{met:11.0,code:'02068',label:'Jump rope'}
};
export const ACTIVITY={sitting:{label:'Mostly sitting',factor:1.2,short:'under 5k steps'},light:{label:'Lightly active',factor:1.35,short:'5–8k steps'},active:{label:'Active',factor:1.5,short:'10k+ steps or active job'}};
export const PACE={gentle:{label:'Gentle',pct:0.25},steady:{label:'Steady',pct:0.5},faster:{label:'Faster',pct:0.75}};
export const DEFAULT_NUTRITION={activity:'light',pace:'steady'};
export const settingsOf=journal=>({...DEFAULT_NUTRITION,...(journal.nutrition||{})});
const performed=m=>m.status!=='skipped';
const mean=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:null;
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),h=s.length>>1;return s.length%2?s[h]:(s[h-1]+s[h])/2};
export const round=(x,step=10)=>x==null?null:Math.round(x/step)*step;

// Weight and lean mass on a date: the latest scan or weighed check-in on or before it, otherwise the earliest after it.
export function bodyAt(journal,date){
 const scans=[...(journal.scans||[])].filter(s=>s.weight).sort((a,b)=>scanTime(a)-scanTime(b));
 const weights=[...scans.map(s=>({date:s.date,lb:s.weight,source:s.device||'scan'})),...(journal.checkins||[]).filter(c=>c.weight!=null).map(c=>({date:c.date,lb:c.weight,source:'check-in'}))].sort((a,b)=>a.date.localeCompare(b.date));
 const pick=list=>list.filter(x=>x.date<=date).at(-1)||list[0]||null;
 const w=pick(weights),lean=pick(scans.filter(s=>s.lbm!=null).map(s=>({date:s.date,lbm:s.lbm})));
 const lb=w?.lb??176,kg=lb/LB;
 // Katch–McArdle from lean mass; both scan devices print a BMR within a few kcal of it.
 const bmr=lean?370+21.6*lean.lbm/LB:22*kg;
 return {lb,kg,lbm:lean?.lbm??null,bmr,weightDate:w?.date??null,weightSource:w?.source??null,assumed:!w};
}

const setsOf=m=>m.sets.length||Number(String(m.result).match(/(\d+)\s*[×x]\s*\d/)?.[1])||3;
// Active calories for one session: (MET − 1) × kg × hours per part. Your RPE nudges the effort (±25%); your minutes rescale the time.
export function sessionCalories(s,body){
 const d=estimateDemand({...s,rpe:null,minutes:null}),moves=s.movements.filter(performed),parts=[];
 const wod=moves.filter(m=>m.section==='WOD'),engine=wod.length?wod.filter(m=>patternsOf(m.name).includes('Engine')).length/wod.length:0;
 const add=(key,minutes,met=MET[key].met)=>{if(minutes>0)parts.push({key,label:MET[key].label,code:MET[key].code,minutes,met})};
 if(moves.some(m=>m.section==='WOD'||m.section==='Strength'))add('warmup',10);
 for(const p of d.parts){
  if(p.section==='WOD'){const key=/hyrox/i.test(s.format)||engine>=.5?'wodEngine':p.intensity<=7?'wodInterval':'wodContinuous';add(key,p.minutes,key==='wodContinuous'&&p.intensity<8?(MET.wodContinuous.met+MET.wodInterval.met)/2:MET[key].met)}
  if(p.section==='Strength')add('strength',p.minutes);
  if(p.section==='Skill')add('skill',p.minutes);
 }
 const extras=moves.filter(m=>m.section==='Extra'),rope=extras.filter(m=>/single-under|double-under|jump rope/i.test(m.name));
 add('rope',5*rope.length);
 add('accessory',extras.filter(m=>!rope.includes(m)).reduce((t,m)=>t+2*setsOf(m),0));
 const est=parts.reduce((t,p)=>t+p.minutes,0),timed=Number.isFinite(s.minutes)&&s.minutes>0,rated=Number.isFinite(s.rpe);
 if(timed&&est)parts.forEach(p=>p.minutes*=s.minutes/est);
 if(rated&&d.intensity){const k=Math.min(1.25,Math.max(.75,s.rpe/d.intensity));parts.forEach(p=>{if(p.key!=='warmup')p.met=1+(p.met-1)*k})}
 parts.forEach(p=>p.kcal=(p.met-1)*body.kg*p.minutes/60);
 const kcal=parts.reduce((t,p)=>t+p.kcal,0),minutes=parts.reduce((t,p)=>t+p.minutes,0);
 return {kcal:Math.round(kcal),low:round(kcal*.75),high:round(kcal*1.25),minutes:Math.round(minutes),perMinute:minutes?kcal/minutes:0,parts,timed,rated};
}
export function sessionEnergy(journal){
 return [...(journal.sessions||[])].sort((a,b)=>a.date.localeCompare(b.date)).map(s=>{const body=bodyAt(journal,s.date);return {session:s,body,...sessionCalories(s,body)}});
}
export function planCalories(plan,body){
 const sets=(plan?.items||[]).reduce((t,i)=>t+(Number(String(i.prescription).match(/^(\d+)\s*×/)?.[1])||2),0),minutes=sets*2;
 return {sets,minutes,kcal:Math.round((MET.accessory.met-1)*body.kg*minutes/60)};
}

// Daily targets for the week after weeks[index]: everyday energy (resting × activity factor) plus that week's expected
// training, minus a deficit sized as a % of body weight per week (≈3,500 kcal per lb, a rough rule).
export function fuelFor(journal,weeks,index,settings=settingsOf(journal)){
 const w=weeks[index];if(!w)return null;
 const body=bodyAt(journal,w.end),act=ACTIVITY[settings.activity]||ACTIVITY.light,pace=PACE[settings.pace]||PACE.steady;
 const recent=weeks.slice(Math.max(0,index-3),index+1),sessionsPerWeek=mean(recent.map(x=>x.sessions.length))||0;
 const energy=sessionEnergy({...journal,sessions:(journal.sessions||[]).filter(s=>s.date>shift(w.end,-28)&&s.date<=w.end)});
 const typical=median(energy.map(x=>x.kcal))||0,plan=planCalories(w.plan,body);
 const weeklyTraining=sessionsPerWeek*typical+plan.kcal,trainingDays=Math.min(7,Math.round(sessionsPerWeek));
 const everyday=body.bmr*act.factor,perTrainingDay=trainingDays?weeklyTraining/trainingDays:0;
 const maintenance={rest:everyday,training:everyday+perTrainingDay,average:everyday+weeklyTraining/7};
 const deficit=pace.pct/100*body.lb*3500/7,floor=body.bmr;
 const target={training:Math.max(floor,maintenance.training-deficit),rest:Math.max(floor,maintenance.rest-deficit)};
 target.average=(target.training*trainingDays+target.rest*(7-trainingDays))/7;
 // Protein 2.3–3.1 g/kg of lean mass while dieting (Helms et al. 2014); fat about 0.8 g/kg body weight; carbs fill the rest.
 const lbmKg=(body.lbm??body.lb*.8)/LB,protein={low:2.3*lbmKg,high:3.1*lbmKg},proteinTarget=2.4*lbmKg,fat=0.8*body.kg;
 const carbs=k=>Math.max(0,(k-proteinTarget*4-fat*9)/4);
 return {forWeek:shift(w.start,7),body,settings,activity:act,pace,sessionsPerWeek,trainingDays,typical,plan,weeklyTraining,everyday,maintenance,deficit,target,floored:target.rest===floor||target.training===floor,
  macros:{protein:proteinTarget,proteinRange:protein,fat,carbs:{training:carbs(target.training),rest:carbs(target.rest)}},expectedLossLb:pace.pct/100*body.lb};
}

// What the scale says so far, and an intake-based calibration once there are two weeks of weights and logged calories.
export function evidence(journal,today){
 const scans=[...(journal.scans||[])].filter(s=>s.weight).sort((a,b)=>scanTime(a)-scanTime(b)),first=scans[0],last=scans.at(-1);
 const days=first&&last&&first!==last?(scanTime(last)-scanTime(first))/864e5:0;
 const scanRate=days>=7?{lbPerWeek:(last.weight-first.weight)/days*7,pctPerWeek:(last.weight-first.weight)/days*7/first.weight*100,from:first,to:last,mixed:new Set(scans.map(s=>String(s.device||'').toLowerCase())).size>1}:null;
 const checkins=journal.checkins||[],weights=weightAverages(checkins);
 const end=today||checkins.map(c=>c.date).sort().at(-1),intake=checkins.filter(c=>c.kcal!=null&&end&&c.date>shift(end,-14)&&c.date<=end);
 const avgIntake=mean(intake.map(c=>c.kcal));
 const calibrated=weights?.delta!=null&&intake.length>=8?Math.round(avgIntake-weights.delta*3500/7):null;
 return {scanRate,weights,intakeCount:intake.length,avgIntake,calibrated};
}
