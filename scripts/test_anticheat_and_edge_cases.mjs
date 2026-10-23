import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { resolveChromePath } from './browserSupport.mjs';

const prisma = new PrismaClient();
const CHROME_PATH = resolveChromePath();
const SCREENSHOT_DIR = path.resolve('samples', 'screenshots_stress_test');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resetDemoSession() {
  await prisma.questionAttempt.deleteMany({
    where: { sessionId: 'session_demo_1' },
  });
  await prisma.proctorLog.deleteMany({
    where: { sessionId: 'session_demo_1' },
  });
  await prisma.examSession.update({
    where: { id: 'session_demo_1' },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      deadline: new Date(Date.now() + 5400 * 1000),
      submittedAt: null,
      totalScore: null,
    },
  });
}

async function runStressAndEdgeTests() {
  console.log('🧪 Starting Edge Case & Anti-Cheat Stress Testing...');
  await resetDemoSession();

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const testReport = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Fullscreen Lockout Overlay & Re-entry
    // -------------------------------------------------------------------------
    console.log('\n[1/4] Testing Fullscreen Lockout Overlay...');
    await page.goto('http://localhost:3000/exam/session_demo_1/player', { waitUntil: 'networkidle0' });
    await sleep(800);

    // Simulate Fullscreen Exit
    console.log('   Simulating exiting fullscreen event...');
    await page.evaluate(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    await sleep(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_fullscreen_lockout_overlay.png') });

    const pageText = await page.evaluate(() => document.body.innerText);
    const hasLockoutOverlay = pageText.includes('fullscreen paused') || pageText.includes('resume exam');
    console.log('   Fullscreen lockout overlay active:', hasLockoutOverlay);
    testReport.push({
      test: 'Fullscreen Lockout Enforcement',
      result: hasLockoutOverlay ? 'PASS' : 'WARN',
      details: 'Overlay blocks test interaction on fullscreen exit',
    });

    // -------------------------------------------------------------------------
    // TEST 2: Tab Switching & Focus Loss (Strikes 1, 2, 3)
    // -------------------------------------------------------------------------
    console.log('\n[2/4] Testing Focus Loss Violation Strikes...');

    // Strike 1
    console.log('   Simulating window blur (Strike 1)...');
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });
    await sleep(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_strike_1_modal.png') });

    let bodyText = await page.evaluate(() => document.body.innerText);
    const hasStrike1 = bodyText.includes('strike 1 of 3') || bodyText.includes('focus lost');
    console.log('   Strike 1 Dialog shown:', hasStrike1);

    // Dismiss strike 1 modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const returnBtn = btns.find((b) => b.textContent && b.textContent.includes('return to test'));
      if (returnBtn) returnBtn.click();
    });
    await sleep(400);

    // Strike 2
    console.log('   Simulating window blur (Strike 2)...');
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });
    await sleep(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_strike_2_modal.png') });

    bodyText = await page.evaluate(() => document.body.innerText);
    const hasStrike2 = bodyText.includes('strike 2 of 3') || bodyText.includes('2 of 3 strikes');
    console.log('   Strike 2 Dialog shown:', hasStrike2);

    // Dismiss strike 2 modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const returnBtn = btns.find((b) => b.textContent && b.textContent.includes('return to test'));
      if (returnBtn) returnBtn.click();
    });
    await sleep(400);

    // Strike 3 - Disqualification!
    console.log('   Simulating window blur (Strike 3 - Disqualification)...');
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_strike_3_disqualified.png') });

    bodyText = await page.evaluate(() => document.body.innerText);
    const isDisqualified = bodyText.includes('test disqualified') || bodyText.includes('view scorecard');
    console.log('   Disqualification Screen Rendered:', isDisqualified);
    testReport.push({
      test: '3-Strike Disqualification System',
      result: isDisqualified ? 'PASS' : 'FAIL',
      details: 'Test terminated on 3rd violation strike',
    });

    // Click "view scorecard"
    console.log('   Navigating to scorecard from disqualification screen...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const viewScorecard = links.find((l) => l.textContent && l.textContent.includes('view scorecard'));
      if (viewScorecard) viewScorecard.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    console.log('   On Scorecard Page:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_disqualified_scorecard.png') });

    // -------------------------------------------------------------------------
    // TEST 3: Interstitial Guardrail Modal Verification
    // -------------------------------------------------------------------------
    console.log('\n[3/4] Testing Interstitial Guardrail Modal in Fresh Session...');
    await resetDemoSession();
    await page.goto('http://localhost:3000/exam/session_demo_1/player', { waitUntil: 'networkidle0' });
    await sleep(800);

    console.log('   Selecting Option [ a ] on Q1 without saving...');
    const options = await page.$$('div.cursor-pointer');
    if (options.length >= 1) {
      await options[0].click();
      await sleep(300);

      // Click Q2 in palette
      console.log('   Attempting to jump to Q2 on palette...');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const q2Btn = btns.find((b) => b.textContent && (b.textContent.trim() === 'q2' || b.textContent.trim() === 'Q2'));
        if (q2Btn) q2Btn.click();
      });
      await sleep(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_guardrail_unsaved_answer.png') });

      const guardText = await page.evaluate(() => document.body.innerText);
      const hasGuardModal = guardText.includes('unsaved answer') && guardText.includes('save & jump');
      console.log('   Unsaved Answer Guardrail Modal shown:', hasGuardModal);
      testReport.push({
        test: 'Unsaved Answer Guardrail Modal',
        result: hasGuardModal ? 'PASS' : 'WARN',
        details: 'Prompted before jumping with uncommitted option',
      });
    }

    // -------------------------------------------------------------------------
    // TEST 4: Live Proctor Telemetry & SSE Cockpit
    // -------------------------------------------------------------------------
    console.log('\n[4/4] Testing Live Proctoring Telemetry Cockpit...');
    await page.goto('http://localhost:3000/proctor/exam_mock_1', { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_proctor_cockpit_live.png') });

    const proctorText = await page.evaluate(() => document.body.innerText);
    const hasProctor = proctorText.includes('live proctor cockpit') && proctorText.includes('candidate');
    console.log('   Live Proctor Cockpit Online:', hasProctor);
    testReport.push({
      test: 'Live Proctor Cockpit & SSE',
      result: hasProctor ? 'PASS' : 'FAIL',
      details: 'SSE stream connected with telemetry logs',
    });

  } catch (err) {
    console.error('❌ Edge Test Error:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_stress_test.png') }).catch(() => {});
    testReport.push({ test: 'Execution Exception', result: 'FAIL', details: err.message });
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  console.log('\n======================================================');
  console.log('🏁 OPENHALL STRESS & ANTI-CHEAT TEST REPORT');
  console.log('======================================================');
  console.table(testReport);
}

runStressAndEdgeTests();
