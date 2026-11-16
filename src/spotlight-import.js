// Offer missing imported movements without rewriting the user's log or reviving deletions automatically.
export function spotlightImport(sessions,original){
 const same=sessions.find(s=>s.date===original.date&&(s.id===original.id||s.title.trim().toLowerCase()===original.title.toLowerCase()));
 const key=m=>m.section+'|'+m.name.trim().toLowerCase();
 const missing=original.movements.filter(m=>!same?.movements.some(x=>key(x)===key(m)));
 return {same,missing};
}
export function addSpotlightImport(sessions,original){
 const {same,missing}=spotlightImport(sessions,original);
 if(!missing.length)return sessions;
 if(!same)return [...sessions,{...structuredClone(original),id:sessions.some(s=>s.id===original.id)?crypto.randomUUID():original.id}];
 return sessions.map(s=>s===same?{...s,movements:[...s.movements,...structuredClone(missing)]}:s);
}
