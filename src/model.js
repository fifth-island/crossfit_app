import {validateCheckins} from './checkins.js';
import {GROUPS,SEGMENTS,SITES,SCAN_FIELDS} from './data.js';
export const day=d=>new Date(d+'T12:00:00');
export const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function weekStart(date){const d=day(date);d.setDate(d.getDate()-(d.getDay()+6)%7);return iso(d)}
export function shift(date,n){const d=day(date);d.setDate(d.getDate()+n);return iso(d)}
export function weekNumber(date){const d=day(date);d.setDate(d.getDate()+3-(d.getDay()+6)%7);const jan4=new Date(d.getFullYear(),0,4,12);return 1+Math.round(((d-jan4)/864e5-3+(jan4.getDay()+6)%7)/7)}
export function coverage(sessions,week){const rows=sessions.filter(s=>s.date>=week&&s.date<=shift(week,6));return Object.fromEntries(GROUPS.map(g=>[g,rows.filter(s=>s.movements.some(m=>m.status==='confirmed'&&m.section!=='Warm-up'&&m.groups.includes(g))).length]))}
export function history(sessions,name){return sessions.flatMap(s=>s.movements.filter(m=>m.name===name&&m.status==='confirmed'&&m.load!==null).map(m=>({...m,date:s.date,title:s.title}))).sort((a,b)=>a.date.localeCompare(b.date))}
export const sessionsBetween=(sessions,from,to)=>sessions.filter(s=>(!from||s.date>=from)&&(!to||s.date<to)).length;
export const lrGap=(l,r)=>l+r?Math.abs(l-r)/((l+r)/2)*100:0;
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(day(d).getTime())&&iso(day(d))===d;
const n0=v=>v===null||(Number.isFinite(v)&&v>=0),nAny=v=>v===null||Number.isFinite(v);
export function validateBackup(data){
 if(!data||data.version!==1||!Array.isArray(data.sessions)||!Array.isArray(data.goals)||(data.scans!==undefined&&!Array.isArray(data.scans)))throw Error('This is not a FORM backup.');
 if(data.appliedUpdates!==undefined&&(!Array.isArray(data.appliedUpdates)||data.appliedUpdates.some(x=>typeof x!=='string')))throw Error('Invalid update history in backup.');
 if(data.checkins!==undefined)validateCheckins(data.checkins);
 if(data.nutrition!==undefined&&(!data.nutrition||typeof data.nutrition!=='object'||!['sitting','light','active'].includes(data.nutrition.activity)||!['gentle','steady','faster'].includes(data.nutrition.pace)))throw Error('Invalid nutrition settings in backup.');
 const ids=new Set();
 for(const s of data.sessions){if(!s||typeof s.id!=='string'||ids.has(s.id)||!validDate(s.date)||!['title','format','score','notes'].every(k=>typeof s[k]==='string')||!Array.isArray(s.movements))throw Error('Invalid session in backup.');ids.add(s.id);
 if(s.rpe!=null&&!(Number.isFinite(s.rpe)&&s.rpe>=1&&s.rpe<=10))throw Error('Session RPE must be between 1 and 10.');if(s.minutes!=null&&!(Number.isFinite(s.minutes)&&s.minutes>0&&s.minutes<=600))throw Error('Session minutes must be between 1 and 600.');
 for(const m of s.movements){if(m?.rir!==undefined&&m.rir!==null&&(!Number.isFinite(m.rir)||m.rir<0||m.rir>10))throw Error('Reps in reserve must be between 0 and 10.');if(!m||!['id','name','prescription','result'].every(k=>typeof m[k]==='string')||!['Strength','WOD','Warm-up','Skill','Extra'].includes(m.section)||!['confirmed','unconfirmed','skipped'].includes(m.status)||!Array.isArray(m.groups)||m.groups.some(g=>!GROUPS.includes(g))||!(m.load===null||(Number.isFinite(m.load)&&m.load>=0))||!Array.isArray(m.sets)||m.sets.some(x=>!Number.isFinite(x.reps)||!Number.isFinite(x.load)||x.reps<0||x.load<0))throw Error('Invalid movement in backup.');}}
 if(data.goals.some(g=>!g||typeof g.id!=='string'||typeof g.title!=='string'||typeof g.done!=='boolean'))throw Error('Invalid goal in backup.');
 const scanIds=new Set();
 for(const c of data.scans||[]){if(!c||typeof c.id!=='string'||scanIds.has(c.id)||!validDate(c.date)||!['time','device','notes'].every(k=>typeof c[k]==='string')||!(Number.isFinite(c.weight)&&c.weight>0)||!n0(c.height)||!SCAN_FIELDS.every(([k])=>n0(c[k]))||!c.segments||!SEGMENTS.every(([k])=>c.segments[k]&&n0(c.segments[k].lean)&&n0(c.segments[k].pct))||!c.control||!nAny(c.control.fat)||!nAny(c.control.lean)||!c.impedance||!['khz20','khz100'].every(f=>c.impedance[f]&&SITES.every(([k])=>n0(c.impedance[f][k]))))throw Error('Invalid scan in backup.');if(c.time!==''&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.time))throw Error('Use a valid scan time (HH:MM).');if(c.pbf!==null&&c.pbf>100)throw Error('Body fat percentage must be between 0 and 100.');if(c.height===0)throw Error('Height must be positive or left blank.');if(c.extras!==undefined)validateExtras(c.extras);scanIds.add(c.id)}
 return data;
}

// Optional device readings beyond the InBody sheet: visceral fat level, subcutaneous fat (lb), waist-hip ratio and fat per segment.
function validateExtras(x){
 const bad=()=>{throw Error('Invalid fat-distribution readings in scan.')};
 if(!x||typeof x!=='object'||Array.isArray(x))bad();
 if(!n0(x.visceral??null)||(x.visceral!=null&&x.visceral>60)||!n0(x.subFat??null)||!n0(x.whr??null)||(x.whr!=null&&x.whr>3))bad();
 if(x.segFat!==undefined&&x.segFat!==null&&(typeof x.segFat!=='object'||!SEGMENTS.every(([k])=>!x.segFat[k]||(n0(x.segFat[k].fat??null)&&n0(x.segFat[k].pct??null)))))bad();
}
// Dates alone cannot establish whether a workout happened before or after a scan.
export function scanTraining(sessions,from,to){return {between:sessions.filter(s=>s.date>from&&(!to||s.date<to)).length,boundary:sessions.filter(s=>s.date===from||(to&&s.date===to)).length}}
export function scanTime(scan){return new Date(`${scan.date}T${scan.time||'00:00'}:00`).getTime()}
export function scanWarnings(scan){
 const warnings=[],has=(...keys)=>keys.every(k=>Number.isFinite(scan[k]));
 if(has('tbw','dlm','bfm','weight')&&Math.abs(scan.tbw+scan.dlm+scan.bfm-scan.weight)>.21)warnings.push('Water + dry lean + fat does not match total weight. Check the copied values.');
 if(has('tbw','dlm','lbm')&&Math.abs(scan.tbw+scan.dlm-scan.lbm)>.21)warnings.push('Water + dry lean does not match lean body mass.');
 if(has('lbm','bfm','weight')&&Math.abs(scan.lbm+scan.bfm-scan.weight)>.21)warnings.push('Lean body mass + fat does not match total weight.');
 if(has('bfm','weight','pbf')&&scan.weight>0&&Math.abs(scan.bfm/scan.weight*100-scan.pbf)>.21)warnings.push('Body fat percentage does not match fat mass ÷ weight.');
 if(has('smm','lbm')&&scan.smm>scan.lbm)warnings.push('Skeletal muscle mass exceeds total lean body mass.');
 return warnings;
}
