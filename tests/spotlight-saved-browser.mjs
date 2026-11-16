import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {seed,ALL_UPDATES,scanSeed} from '../src/data.js';
const browser=await chromium.launch({channel:'chrome'});
try{
 const url=new URL('/?workout=2026-11-05#muscle-spotlight',process.env.FORM_TEST_URL||'http://127.0.0.1:5173');
 for(const scenario of ['fresh','absent','partial']){
  const page=await browser.newPage();await page.goto(url.href);
  if(scenario!=='fresh'){
   const sessions=structuredClone(seed.filter(s=>scenario==='partial'||s.id!=='nov05'));
   if(scenario==='partial'){const s=sessions.find(s=>s.id==='nov05');s.notes='Keep this note';s.movements=s.movements.filter(m=>m.name==='Pendlay Row');}
   await page.evaluate(j=>localStorage.setItem('form.training.v1',JSON.stringify(j)),{version:1,sessions,scans:scanSeed,goals:[],appliedUpdates:ALL_UPDATES});
   await page.reload();await page.locator('#spot-restore').click();await page.reload();
   assert.equal(await page.locator('#spot-restore').count(),0);
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('form.training.v1')).sessions.filter(s=>s.date==='2026-11-05'));
   assert.equal(saved.length,1);if(scenario==='partial')assert.equal(saved[0].notes,'Keep this note');
  }
  assert.equal(await page.locator('#spot-scope').inputValue(),'2026-11-05');
  assert.equal(await page.getByLabel('Muscle group').inputValue(),'All muscles');
  assert.match(await page.locator('.contributions [data-edit="nov05"]').innerText(),/Preacher Curl/);
  await page.getByLabel('Muscle group').selectOption('Biceps');
  assert.match(await page.locator('.contributions [data-edit="nov05"]').innerText(),/DB Curl.*Preacher Curl/s);
  await page.close(); console.log(scenario+' passed');
 }
}finally{await browser.close()}
