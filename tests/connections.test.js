import test from 'node:test';
import assert from 'node:assert/strict';
import {seed} from '../src/data.js';
import {analyze,accessorySets} from '../src/insight-model.js';
import {patternsOf,balanceOf} from '../src/analytics.js';
import {insightsPage} from '../src/insight-view.js';
test('November 5 direct accessories include text-only work without inventing load or effort',()=>{
 const session=seed.find(s=>s.id==='nov05'),a=analyze({sessions:[session]});
 assert.deepEqual(a.targets.slice(0,3).map(t=>t.accessorySets),[12,8,4]);assert.equal(a.effortEntries,0);assert.equal(session.movements.find(m=>m.name==='Upper Cable Fly').load,null);
 assert.equal(accessorySets({...session.movements.at(-1),status:'unconfirmed'}),0);
 assert.equal(accessorySets({section:'Extra',status:'confirmed',sets:[],result:'40 reps at 25 lb',prescription:'4×10 at 25 lb'}),0);
 assert.match(insightsPage({sessions:[session],scans:[]}),/Pendlay Row/);
});
test('radar receives documented movement patterns and excludes ambiguous rows',()=>{
 for(const [name,pattern] of [['Shoulder-to-Overhead','Vertical push'],['Sled Push','Engine'],['MB Slam','Core']])assert.ok(patternsOf(name).includes(pattern));
 assert.deepEqual(patternsOf('Reverse Fly'),['Pull']);assert.ok(!patternsOf('Bench Plank').includes('Horizontal push'));
 assert.equal(balanceOf([{movements:[{name:'Seated EZ-Bar Preacher Row',status:'confirmed',section:'Extra'}]}]).row,false);
});
