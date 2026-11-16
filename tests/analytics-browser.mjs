import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const BASE=process.env.BASE||'http://127.0.0.1:5173';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(BASE);await page.evaluate(()=>localStorage.clear());
await page.goto(BASE+'/#insights');await page.waitForSelector('.insight-tabs');
assert.equal(await page.locator('.insight-tabs .active').innerText(),'DASHBOARD');
assert.equal(await page.locator('.viz.radar').count(),2);assert.match(await page.locator('#dash-week option:checked').innerText(),/Oct 26/);
// Selecting a weekly-load column scopes the radar, KPIs and priority charts to that week.
await page.locator('.viz.columns').nth(4).locator('[data-dash-week="2026-10-12"]').click();
assert.equal(await page.locator('#dash-week').inputValue(),'2026-10-12');assert.match(await page.locator('.kpi-row .stat').nth(1).innerText(),/4\s*this week/);
await page.locator('[data-dash-step="1"]').click();assert.equal(await page.locator('#dash-week').inputValue(),'2026-10-19');
await page.locator('#radar-compare').selectOption('prev');assert.match(await page.locator('.viz-card').first().innerText(),/Week before/);
// Hover tooltip uses text content.
await page.locator('.viz.radar').first().locator('.viz-hit').nth(1).hover();await page.waitForTimeout(150);
assert.match(await page.locator('#viz-tip').innerText(),/Chest · priority/);assert.equal(await page.locator('#viz-tip').evaluate(el=>el.classList.contains('show')),true);
// Load progression: one small chart per lift, each with its own hover readout.
assert.equal(await page.locator('.lift-mini').count(),12);const squat=page.locator('.lift-mini',{hasText:'Back Squat'});assert.match(await squat.innerText(),/\+40 lb/);
await squat.locator('.viz-cross').last().hover();await page.waitForTimeout(150);assert.match(await page.locator('#viz-tip').innerText(),/145 lb · Strength/);
// Rankings: latest log, sorting, opening a session shows its analysis and RPE fields.
await page.locator('[data-insight-tab="rankings"]').first().click();assert.equal(page.url().endsWith('#insights/rankings'),true);
assert.match(await page.locator('.hbar').first().innerText(),/Hyrox Saturday/);assert.equal(await page.locator('.hbar').count(),27);
await page.locator('#rank-sort').selectOption('intensity');assert.match(await page.locator('.hbar').first().innerText(),/Just Pretend/);
await page.locator('.hbar',{hasText:'Squid Ink'}).click();assert.equal(await page.locator('#editor').isVisible(),true);
assert.match(await page.locator('.editor-report').innerText(),/HOW THIS SESSION COMPARES/i);
await page.locator('#session-rpe').fill('9');await page.locator('#session-minutes').fill('55');await page.getByRole('button',{name:'Save session',exact:true}).click();
await page.waitForSelector('#toast.show');assert.match(await page.locator('#toast').innerText(),/#\d+ of 27 hardest.*active kcal/);
assert.match(await page.locator('.hbar',{hasText:'Squid Ink'}).innerText(),/9\.0\/10/);
await page.reload();await page.locator('#rank-sort').selectOption('points');assert.match(await page.locator('.hbar',{hasText:'Squid Ink'}).innerText(),/495 pts/);
await page.locator('.hbar',{hasText:'Squid Ink'}).click();assert.equal(await page.locator('#session-rpe').inputValue(),'9');await page.locator('.cancel-dialog').click();
// Weekly reviews: every week listed, latest open, plan opens as an unconfirmed draft.
await page.locator('[data-insight-tab="weekly"]').first().click();assert.equal(await page.locator('.week-review').count(),6);
assert.equal(await page.locator('.week-review[open]').count(),1);assert.match(await page.locator('.week-review[open] summary').innerText(),/OCT 26/);assert.match(await page.locator('.week-review[open] .follow-through').innerText(),/8 of 8/);
await page.locator('[data-week-plan="2026-10-26|A"]').click();assert.match(await page.locator('#session-title').inputValue(),/Accessory block A/);
assert.equal(await page.locator('.movement-row').count(),6);assert.equal(await page.locator('.m-name').first().inputValue(),'Low-to-high Cable Fly');assert.equal(await page.locator('.m-status').first().inputValue(),'unconfirmed');assert.equal(await page.locator('#session-date').inputValue(),'2026-11-02');await page.locator('.cancel-dialog').click();
await page.locator('.week-review summary',{hasText:'SEP 21'}).click();assert.match(await page.locator('#week-2026-09-21').innerText(),/WHAT TO IMPROVE/i);
await page.locator('[data-insight-tab="review"]').first().click();assert.match(await page.locator('.goal-assessments').innerText(),/Stronger glutes/i);
// Nutrition: targets respond to the settings, which persist with the journal; every session has an estimate.
await page.locator('[data-insight-tab="nutrition"]').first().click();assert.match(await page.locator('.fuel-hero h2').innerText(),/TRAINING DAYS.*REST DAYS/i);
const trainingBefore=await page.locator('.fuel-kpis .stat strong').first().innerText();await page.locator('#fuel-pace').selectOption('faster');
assert.notEqual(await page.locator('.fuel-kpis .stat strong').first().innerText(),trainingBefore);await page.reload();assert.equal(await page.locator('#fuel-pace').inputValue(),'faster');
assert.equal(await page.locator('.energy-table tbody tr').count(),27);assert.equal(await page.locator('.ledger-row').count(),6);
await page.locator('.card [data-action="checkin"]').first().click();assert.equal(await page.locator('[data-check="kcal"]').isVisible(),true);await page.locator('.cancel-dialog').click();
await page.locator('[data-insight-tab="weekly"]').first().click();assert.match(await page.locator('.week-review[open] .fuel-strip').innerText(),/TRAINING DAY/i);
// Overview strip and logbook badges link into the analysis.
await page.locator('[data-page="overview"]').first().click();await page.locator('.week-call').click();assert.equal(await page.locator('.insight-tabs .active').innerText(),'WEEKLY');
await page.locator('[data-page="journal"]').first().click();assert.equal(await page.locator('.demand-chip').count(),27);
// Phone width: no horizontal page scroll on any analytics tab.
await page.setViewportSize({width:390,height:844});
for(const t of ['','/weekly','/rankings','/nutrition','/review']){await page.goto(BASE+'/#insights'+t);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,`overflow on #insights${t}`)}
assert.deepEqual(errors,[]);console.log('PASS: dashboard week scoping, radar compare, tooltips, lift small multiples, rankings sort, RPE save + persistence, nutrition targets + settings persistence, weekly reviews, plan drafts, goal review glutes, overview strip, logbook badges, phone width; no browser errors.');await browser.close();
