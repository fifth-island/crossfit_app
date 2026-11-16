import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage();await page.goto(process.env.FORM_TEST_URL||'http://127.0.0.1:5173');
 const scope=page.locator('#spot-scope'), muscle=page.getByLabel('Muscle group'), entry=page.locator('.contributions [data-edit="nov05"]');
 assert.equal(await scope.inputValue(),'all');await muscle.selectOption('Chest');assert.match(await entry.innerText(),/Incline Bench Press/);
 await scope.selectOption('2026-11-05');assert.equal(await page.locator('.contributions button').count(),1);
 for(const [group,move] of [['Chest','Upper Cable Fly'],['Biceps','DB Curl'],['Triceps','Tricep Rope Pushdown'],['Upper back','Pendlay Row']]){
  await muscle.selectOption(group);assert.ok((await entry.innerText()).includes(move));
 }
 await entry.click();assert.equal(await page.locator('#session-date').inputValue(),'2026-11-05');
 await page.getByRole('button',{name:'Close editor'}).click();await page.getByRole('button',{name:'Next week',exact:true}).click();
 assert.equal(await scope.inputValue(),'week');assert.equal(await entry.count(),0);
 console.log('Verified November 5 in all-history and date scopes, four muscle groups, session detail, and weekly filtering.');
}finally{await browser.close()}
