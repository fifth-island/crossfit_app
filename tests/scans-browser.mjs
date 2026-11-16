import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {scanSeed,seed,ALL_UPDATES} from '../src/data.js';
const browser=await chromium.launch({channel:'chrome'});
try{
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});
const a={...structuredClone(scanSeed[0]),id:'a',date:'2026-10-05',time:'09:00'},b={...structuredClone(a),id:'b',time:'12:00',weight:177.8},c={...structuredClone(a),id:'c',date:'2026-10-06',time:'09:00',weight:178.8};
b.segments.leftArm.lean=8.5;c.segments.leftArm.lean=8.7;
await page.evaluate(data=>localStorage.setItem('form.training.v1',JSON.stringify(data)),{version:1,sessions:seed,goals:[],scans:[a,b,c],appliedUpdates:ALL_UPDATES});
await page.reload();await page.locator('[data-page="body"]').first().click();
assert.match(await page.locator('.scan-stats .stat').first().innerText(),/\+1\.0 lb/i);
await page.locator('#compare-scan').selectOption('baseline');assert.match(await page.locator('.scan-stats .stat').first().innerText(),/\+2\.0 lb/i);
await page.locator('.seg-label[data-segment="leftArm"]').click();assert.match(await page.locator('.segment-insight').innerText(),/0\.37 lb/i);
await page.locator('path[data-segment="rightLeg"]').focus();await page.keyboard.press('Enter');assert.match(await page.locator('.segment-insight').innerText(),/RIGHT LEG/i);
await page.locator('#scan-select').selectOption('b');const pts=await page.locator('.trend').first().locator('g[data-select-scan] circle:not(.point-hit)').evaluateAll(els=>els.map(e=>e.getAttribute('cx')));assert.equal(pts.length,2);assert.notEqual(pts[0],pts[1]);
await page.locator('.trend').first().locator('[data-select-scan="a"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#scan-select').inputValue(),'a');assert.equal(await page.locator('.trend').count(),0);
await page.locator('[data-action="add-scan"]').click();await page.locator('[data-k="weight"]').fill('175');await page.locator('[data-k="pbf"]').fill('101');await page.getByRole('button',{name:'Save scan',exact:true}).click();assert.equal(await page.locator('#editor').isVisible(),true);assert.equal(await page.locator('[data-k="pbf"]').evaluate(e=>e.validity.rangeOverflow),true);await page.locator('[data-k="pbf"]').fill('');await page.getByRole('button',{name:'Save scan',exact:true}).click();assert.equal(await page.locator('#editor').isVisible(),false);assert.match(await page.locator('.scan-stats').innerText(),/—/);
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.locator('[data-edit-scan]').first().click();await page.screenshot({path:'tests/scan-editor-mobile.png',fullPage:true});assert.equal(await page.locator('#editor').evaluate(e=>e.scrollWidth<=e.clientWidth),true);await page.locator('.cancel-dialog').click();
page.on('dialog',d=>d.accept());await page.locator('#restore').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,sessions:seed,goals:[]}))});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('form.training.v1')).scans.length===0);assert.match(await page.locator('.baseline-note').innerText(),/No scans yet/i);
assert.deepEqual(errors,[]);console.log('PASS: comparison modes, regional deltas, keyboard controls, timestamped trends, earlier-scan scope, percentage validation, missing data, mobile editor, and exact legacy restore.');
}finally{await browser.close()}
