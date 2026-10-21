import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(process.cwd(), 'samples', 'screenshots_studio_forms');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runGoogleFormsStudioTest() {
  console.log('🧪 Starting Teacher Studio Google Forms UI Verification...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1366, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const report = [];

  try {
    // 1. Navigate to Teacher Studio
    console.log('[1/5] Navigating to Teacher Studio (/studio)...');
    await page.goto('http://localhost:3000/studio', { waitUntil: 'networkidle0' });
    await sleep(600);

    // Find any exam and click edit questions link
    const examComposerUrl = await page.evaluate(() => {
      const link = document.querySelector('a[href*="/studio/"]');
      return link ? link.getAttribute('href') : null;
    });

    if (!examComposerUrl) {
      throw new Error('No exam found in Studio to test question composer.');
    }

    console.log(`[2/5] Opening Question Composer (${examComposerUrl})...`);
    await page.goto(`http://localhost:3000${examComposerUrl}`, { waitUntil: 'networkidle0' });
    await sleep(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_google_forms_card_initial.png') });

    // Verify Google Forms card elements
    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const hasFormsCard = pageText.includes('question #') && 
                         pageText.includes('multiple choice') && 
                         pageText.includes('options:') && 
                         pageText.includes('answer key:') &&
                         pageText.includes('add option') &&
                         pageText.includes('duplicate');

    console.log('   Google Forms Question Card Structure Present:', hasFormsCard);
    report.push({
      test: '1. Google Forms Card Layout',
      status: hasFormsCard ? 'PASS' : 'FAIL',
      details: 'Card header, question type dropdown, answer key, duplicate bar verified',
    });

    // 2. Test Math bar and Diagram toggles
    console.log('[3/5] Testing Diagram and Math Palette Toggles...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const mathBtn = btns.find((b) => b.textContent && b.textContent.includes('math bar'));
      if (mathBtn) mathBtn.click();
      const imgBtn = btns.find((b) => b.textContent && b.textContent.includes('add image'));
      if (imgBtn) imgBtn.click();
    });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_math_and_diagram_toggled.png') });

    const toggledText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const hasToggles = toggledText.includes('click formula snippet') && toggledText.includes('diagram / image url');
    console.log('   Toggles expanded cleanly:', hasToggles);
    report.push({
      test: '2. Math Palette & Diagram Toggles',
      status: hasToggles ? 'PASS' : 'FAIL',
      details: 'Instant collapsible math snippet palette and image input preview',
    });

    // 3. Test Keyboard Navigation & Enter Key Hopping
    console.log('[4/5] Testing Fluid Enter Key Option Hopping...');
    // Type question prompt
    await page.type('textarea', 'what is the value of $\\lim_{x \\to 0} \\frac{\\sin x}{x}$?');

    // Focus first option, type, and press Enter
    const optionInputs = await page.$$('input[placeholder*="formula"]');
    if (optionInputs.length >= 4) {
      await optionInputs[0].click();
      await page.keyboard.type('$1$');
      await page.keyboard.press('Enter');
      await sleep(150);

      // Now on option 2
      await page.keyboard.type('$0$');
      await page.keyboard.press('Enter');
      await sleep(150);

      // Option 3
      await page.keyboard.type('$\\infty$');
      await page.keyboard.press('Enter');
      await sleep(150);

      // Option 4
      await page.keyboard.type('$-1$');
      await page.keyboard.press('Enter');
      await sleep(200);
    }

    // Check if hitting Enter on last option created option 5 automatically!
    const countAfterEnter = await page.evaluate(() => {
      return document.querySelectorAll('input[placeholder*="formula"]').length;
    });
    console.log(`   Options count after Enter key on last option: ${countAfterEnter} (Auto-expanded from 4 to 5)`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_enter_key_options_added.png') });

    const enterKeyPass = countAfterEnter === 5;
    report.push({
      test: '3. Google Forms Enter Key Navigation',
      status: enterKeyPass ? 'PASS' : 'FAIL',
      details: `Enter key hopped options and auto-added option #5 (count: ${countAfterEnter})`,
    });

    // 4. Test Selecting Option Answer Key & Duplicating
    console.log('[5/5] Testing Answer Key Selection & Question Duplication...');
    // Click option B (index 1) radio button
    await page.evaluate(() => {
      const radioBtns = Array.from(document.querySelectorAll('button[title*="correct answer"]'));
      if (radioBtns.length >= 2) {
        radioBtns[0].click(); // Option A is 1
      }
    });
    await sleep(200);

    // Click "duplicate" button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const dupBtn = btns.find((b) => b.textContent && b.textContent.includes('duplicate'));
      if (dupBtn) dupBtn.click();
    });
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_answer_key_and_duplicate.png') });

    const finalCardText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const duplicateSuccess = finalCardText.includes('question duplicated as a new draft');
    console.log('   Duplicate Question Feedback:', duplicateSuccess);
    report.push({
      test: '4. Instant Question Duplication',
      status: duplicateSuccess ? 'PASS' : 'FAIL',
      details: 'Cloned question stem and choices into a fresh editable draft',
    });

  } catch (err) {
    console.error('❌ Google Forms Studio Test Error:', err);
    report.push({ test: 'Execution Exception', status: 'FAIL', details: err.message });
  } finally {
    await browser.close();
  }

  console.log('\n======================================================');
  console.log('🏁 TEACHER STUDIO GOOGLE FORMS UI TEST REPORT');
  console.log('======================================================');
  console.table(report);

  const allPassed = report.every((r) => r.status === 'PASS');
  if (!allPassed) {
    process.exit(1);
  }
}

runGoogleFormsStudioTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
