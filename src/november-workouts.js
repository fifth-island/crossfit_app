// "m" builds journal movement records using the same muscle map as the editor.
export function novemberWorkouts(m){
 const s=(day,title,format,score,notes,movements)=>({id:'nov'+day,date:'2026-11-'+day,title,format,score,notes,movements});
 const w=(name,board,result='',extra={})=>m(name,'WOD',board,result,extra);
 const strength=(name,board,result,load=null)=>m(name,'Strength',board,result,{load});
 const extra=(name,result)=>m(name,'Extra','Gym accessory work',result);
 const sets=(name,n,reps,load,detail='')=>m(name,'Extra','Gym accessory work',n+'×'+reps+' at '+load+' lb'+detail,{load,sets:Array.from({length:n},()=>({reps,load}))});
 const du=(board,replacement)=>w('Double-under',board,'Replaced by '+replacement,{status:'skipped'});
 return [
 s('02','Switch Witch','Ladder · For time','7:50','Full ladder completed.',[
  strength('Pause Chin-up','3–3–3; 5-second eccentric','Bodyweight'),strength('Chin-up','3–2–1','Bodyweight'),
  w('Row','6–12–18–12–6 calories','Full ladder completed'),w('Push Press','4–8–12–8–4; Rx 115/75 · L3 95/65 · L2 85/55 · L1 75/45','70 lb; full ladder',{load:70})]),
 s('05','Single-unders, swings & slams','9-minute AMRAP','4 rounds + 60 single-unders','Strength: four giant sets. Preacher curls performed seated with an EZ-bar.',[
  strength('Pendlay Row','4 sets: 5–7 reps','105 lb',105),strength('Weighted Side Plank','4 sets: 30 seconds per side','Weight not recorded'),strength('Prone Y','4 sets: 8–10 reps; hold 5 seconds',''),
  du('30 per round','single-unders'),w('Single-under','Double-under substitute','4 rounds + 60 single-unders'),w('Ukrainian KB Swing','13 reps; 60/44 lb','35 lb KB',{load:35}),w('MB Slam','10 reps; 20/14 lb','14 lb ball',{load:14}),
  extra('Upper Cable Fly','4×12 at 25 lb per side'),extra('Mid Cable Fly','4×12 at 30 lb per side'),sets('Incline Bench Press',4,12,85,' total (35 lb bar + 50 lb)'),
  extra('DB Curl','4×12 at 30 lb'),sets('Preacher Curl',4,12,60),sets('Tricep Rope Pushdown',4,12,30)]),
 s('09','Piddle Press Express','4 rounds for time','12:10','',[
  strength('Push Press','2×10 @65%, 2×6 @70–77%','95 lb',95),
  w('Shoulder-to-Overhead','8 reps; Rx 155/105 · L3 135/95 · L2 115/75 · L1 95/65','95 lb',{load:95}),w('Rope Climb','2 reps','As written'),w('Burpee Over Bar','6 reps','Included in timed workout'),w('Deadlift','8 reps; same barbell levels','95 lb',{load:95}),m('Single-under','Extra','Additional jump rope','500 single-unders')]),
 s('10','Poached','15-minute cap','110 of 150 burpees · 40 short at cap','Box muscle-ups as written; number completed not supplied.',[
  strength('Bench Press','2×10 @65%, 2×6 @75%, 1×3 @80%','145 lb',145),w('Box Muscle-up','2–4–6–8–10','Box muscle-ups as written'),du('10 × muscle-up reps','burpees'),w('Burpee','Substitute: 10–20–30–40–50','110 of 150 at cap')]),
 s('11','Holleyman','30 rounds for time','30:51','All 30 rounds completed.',[
  w('Wall Ball','5 reps; 20/14 lb','12 lb ball',{load:12}),w('Handstand Push-up','3 reps','Included in all 30 rounds; scaling not recorded'),w('Power Clean','1 rep; Rx 225/155 · L3 205/135 · L2 185/115 · L1 155/105','85 lb bar',{load:85})]),
 s('12','Burpees & American swings','4 × 3-minute AMRAP · 3 min rest between','1+9 / 1+9 / 1+9 / 1+15','Scores are listed separately in interval order. Cable fly loads were reported as 20 → 30 lb; per-side convention assumed, not confirmed.',[
  w('Machine Calories','Buy-ins: 21/18, 18/15, 15/12, 12/9 calories','Machine and calorie option not recorded'),w('Burpee','9 reps','Included in the four interval scores'),w('American KB Swing','12 reps','KB weight not recorded'),
  extra('Mid Cable Fly','4×12 at 20 → 30 lb; per side assumed'),extra('Lower Cable Fly','4×12 at 20 → 30 lb; per side assumed'),sets('Incline Bench Press',4,6,85)]),
 s('13','Renegade of Pump','11-minute AMRAP','3 rounds + 13 reps','Athlete reports 3+13; board reads 3+11.',[
  strength('Back Squat','3×10 @60–70%, 1×4 @80%','125 lb',125),du('32 reps','64 single-unders'),w('Single-under','Double-under substitute','64 single-unders per round'),w('Push-up to Renegade Row','12 reps; Rx 50/35 · L3 45/30 · L2 40/25 · L1 35/20','30 lb DBs'),w('MB Sit-up','8 reps; 20/14 lb','20 lb ball',{load:20})]),
 s('14','HYROX Partner Relay','Partner relay · 45-minute cap','45:00 · at the cap','With Ana. Completion of all rounds is unconfirmed; the board specifies team work, not individual rep totals.',[
  w('Run','0.5 mile before each of the three blocks'),w('Power Clean','After each run: 10 rounds of 10 (135/95), then 8 rounds of 8 (155/105), then 6 rounds of 6 (185/125); paired with the movements below','85 lb bar; individual reps not recorded',{load:85}),
  w('Hand Release Push-up','Block 1: 10 per round after cleans'),w('Burpee','Block 2: 8 per round after cleans'),w('Burpee Over Bar','Block 3: 6 per round after cleans'),
  sets('Short-Bar Cable Biceps Curl',4,12,35),sets('Bayesian Cable Curl',4,12,30),sets('Overhead EZ-Bar Triceps Extension',4,12,30),sets('Tricep Rope Pushdown',4,12,35),sets('Preacher Curl',3,12,60)])
 ];
}
