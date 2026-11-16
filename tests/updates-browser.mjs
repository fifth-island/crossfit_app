import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {seed,scanSeed} from '../src/data.js';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});
 const old={version:1,sessions:structuredClone(seed.slice(0,6)),goals:[{id:'personal',title:'Keep this goal',done:true}],scans:structuredClone(scanSeed)};
 old.sessions[0].notes='Preserve this note';
 await page.evaluate(data=>localStorage.setItem('form.training.v1',JSON.stringify(data)),old);await page.reload();
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('form.training.v1')));
 let stored=await read();assert.equal(stored.sessions.length,35);assert.equal(stored.sessions[0].notes,'Preserve this note');assert.deepEqual(stored.scans,old.scans);assert.deepEqual(stored.goals,old.goals);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('form.training.v1.before-nov05-preacher-curl-v1'))),old);
 await page.reload();assert.equal((await read()).sessions.length,35);
 await page.locator('[data-page="journal"]').first().click();assert.equal(await page.locator('.session-card').count(),35);await page.getByRole('button',{name:/Blitzen/}).click();assert.equal(await page.locator('#session-score').inputValue(),'14:35');await page.locator('.cancel-dialog').click();
 for(const [title,section] of [['Clothesline','Extra'],['Jin-Booty Bday Burn','Skill']]){await page.getByRole('button',{name:new RegExp(title)}).click();assert.equal(await page.locator('.m-section').evaluateAll((els,section)=>els.some(e=>e.value===section),section),true);await page.getByRole('button',{name:'Save session',exact:true}).click();}
 await page.reload();stored=await read();assert.equal(stored.sessions.find(s=>s.id==='oct06').movements.find(m=>m.name==='Single-under').section,'Extra');assert.equal(stored.sessions.find(s=>s.id==='oct14').movements.find(m=>m.name==='Muscle-up Drill').section,'Skill');
 page.on('dialog',d=>d.accept());await page.locator('#restore').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('form.training.v1')).sessions.length===6);await page.reload();assert.equal((await read()).sessions.length,6);
 console.log('PASS: existing journal updated once, original backup retained, goals/scans/edits preserved, 35 sessions rendered, explicit restore remains exact after reload.');
}finally{await browser.close()}
