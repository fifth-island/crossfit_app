import {addedWorkouts,latestWorkouts,october24Workouts,october31Workouts,november14Workouts,WORKOUT_UPDATES,october31Scans,SCAN_UPDATE,MAP,MUSCLE_UPDATE,CURL_UPDATE} from './data.js';
const normalize=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
const sameSession=(a,b)=>a.id===b.id||(a.date===b.date&&(normalize(a.title)===normalize(b.title)||b.movements.some(m=>m.section==='Strength'&&a.movements.some(e=>e.section==='Strength'&&normalize(e.name)===normalize(m.name)))));
// Versioned batches do not resurrect earlier deleted imports or replace manual edits.
export function applyWorkoutUpdate(journal){
 let result=journal;
 for(const [index,batch] of [addedWorkouts,latestWorkouts,october24Workouts,october31Workouts,november14Workouts].entries()){
  const marker=WORKOUT_UPDATES[index];if(result.appliedUpdates?.includes(marker))continue;
  const additions=batch.filter(incoming=>!result.sessions.some(existing=>sameSession(existing,incoming)));
  result={...result,sessions:[...result.sessions,...structuredClone(additions)],appliedUpdates:[...(result.appliedUpdates||[]),marker]};
 }
 // Scans follow the same rule: added once, never re-added after deletion, and skipped when a scan for that date and time already exists.
 if(!result.appliedUpdates?.includes(SCAN_UPDATE)){
  const scans=result.scans||[],additions=october31Scans.filter(incoming=>!scans.some(x=>x.id===incoming.id||(x.date===incoming.date&&(x.time===incoming.time||normalize(x.device||'')===normalize(incoming.device)))));
  result={...result,scans:[...scans,...structuredClone(additions)],appliedUpdates:[...(result.appliedUpdates||[]),SCAN_UPDATE]};
 }
 return repairMuscleMappings(result);
}

export function repairMuscleMappings(journal){
 if(!journal.appliedUpdates?.includes(CURL_UPDATE)){
  const sessions=journal.sessions.map(s=>{
   if(s.date!=='2026-11-05'||!s.movements.some(m=>m.section==='Extra'&&m.name==='Seated EZ-Bar Preacher Row'))return s;
   return {...s,notes:s.notes.replace('Seated EZ-Bar Preacher Row is recorded as named; exact movement not confirmed.','Preacher curls performed seated with an EZ-bar.'),movements:s.movements.map(m=>m.section==='Extra'&&m.name==='Seated EZ-Bar Preacher Row'?{...m,name:'Preacher Curl',groups:[...MAP['Preacher Curl']]}:m)};
  });
  journal={...journal,sessions,appliedUpdates:[...(journal.appliedUpdates||[]),CURL_UPDATE]};
 }
 if(journal.appliedUpdates.includes(MUSCLE_UPDATE))return journal;
 const sessions=journal.sessions.map(s=>{
  if(!['nov05','nov12'].includes(s.id))return s;
  return {...s,movements:s.movements.map(m=>m.name==='Incline Bench Press'&&m.section==='Extra'&&m.groups.length===0
    ?{...m,groups:[...MAP[m.name]]}:m)};
 });
 return {...journal,sessions,appliedUpdates:[...(journal.appliedUpdates||[]),MUSCLE_UPDATE]};
}
