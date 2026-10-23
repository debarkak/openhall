import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { resolveChromePath } from './browserSupport.mjs';

const prisma = new PrismaClient();
const CHROME_PATH = resolveChromePath();
const SCREENSHOT_DIR = path.resolve('samples', 'screenshots_auth_test');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function verifyScryptHash(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, expectedKeyHex] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const expectedKey = Buffer.from(expectedKeyHex, 'hex');
  return crypto.timingSafeEqual(derivedKey, expectedKey);
}

async function runCredentialsAndEncryptionTests() {
  console.log('🔐 Starting OpenHall Credentials & Encryption Verification...');

  const report = [];

  // =========================================================================
  // 1. Cryptographic Salted Scrypt Encryption Unit Verification
  // =========================================================================
  console.log('\n[1/5] Verifying Salted Scrypt Cryptographic Key Derivation...');
  const teacherUser = await prisma.user.findUnique({ where: { email: 'teacher@openhall.edu' } });
  const studentUser = await prisma.user.findUnique({ where: { email: 'student@openhall.edu' } });

  const teacherHashValid = verifyScryptHash('teacher123', teacherUser.passwordHash);
  const teacherHashWrong = verifyScryptHash('wrongpassword', teacherUser.passwordHash);

  const studentHashValid = verifyScryptHash('student123', studentUser.passwordHash);
  const studentHashWrong = verifyScryptHash('wrongpassword', studentUser.passwordHash);

  const saltRandomness = teacherUser.passwordHash.split(':')[0] !== studentUser.passwordHash.split(':')[0];

  console.log('   Teacher Password Hash Verification (Correct):', teacherHashValid);
  console.log('   Teacher Password Hash Verification (Wrong Rejected):', !teacherHashWrong);
  console.log('   Student Password Hash Verification (Correct):', studentHashValid);
  console.log('   Student Password Hash Verification (Wrong Rejected):', !studentHashWrong);
  console.log('   Cryptographic Random Salt Divergence:', saltRandomness);

  report.push({
    test: '1. Scrypt Key Derivation & Timing-Safe Verification',
    status: teacherHashValid && !teacherHashWrong && studentHashValid && !studentHashWrong ? 'PASS' : 'FAIL',
    details: 'Salted scrypt 64-byte hashes validated in database',
  });

  // =========================================================================
  // 2. Launch Browser for Live Login Testing
  // =========================================================================
  console.log('\n[2/5] Launching Chrome Headless Browser for Authentication Flows...');
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

  try {
    // -----------------------------------------------------------------------
    // Test Wrong Credentials Rejection
    // -----------------------------------------------------------------------
    console.log('\n[3/5] Testing Invalid Credentials Rejection at /login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_page_initial.png') });

    // Enter wrong password
    await page.type('input[type="email"]', 'student@openhall.edu');
    await page.type('input[type="password"]', 'incorrectPassword123');
    await page.click('button[type="submit"]');
    await sleep(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_login_error_rejected.png') });

    const errorVisible = await page.evaluate(() => {
      const el = document.body.innerText;
      return el.includes('invalid email or password');
    });
    console.log('   Invalid credentials error banner rendered:', errorVisible);
    report.push({
      test: '2. Unauthorized Password Rejection',
      status: errorVisible ? 'PASS' : 'FAIL',
      details: '401 Unauthorized with 2005 error banner',
    });

    // -----------------------------------------------------------------------
    // Test Student Login & Lobby Access
    // -----------------------------------------------------------------------
    console.log('\n[4/5] Testing Student Login & Cookie Session...');
    // Click quick student credential button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const studentPreset = btns.find((b) => b.textContent && b.textContent.includes('student@openhall.edu'));
      if (studentPreset) studentPreset.click();
    });
    await sleep(400);

    // Click submit
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    console.log('   Navigated to destination:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_student_lobby_authenticated.png') });

    const studentLobbyText = await page.evaluate(() => document.body.innerText);
    const hasStudentSession = page.url().includes('lobby') && studentLobbyText.includes('sign out') && studentLobbyText.includes('student');
    console.log('   Student Session in Lobby Verified:', hasStudentSession);
    report.push({
      test: '3. Student Encrypted Login Flow',
      status: hasStudentSession ? 'PASS' : 'FAIL',
      details: 'Signed in as student at /lobby',
    });

    // Sign out
    console.log('   Signing out student...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const signOutBtn = btns.find((b) => b.textContent && b.textContent.includes('sign out'));
      if (signOutBtn) signOutBtn.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    console.log('   Returned to:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_signed_out_gate.png') });

    // -----------------------------------------------------------------------
    // Test Teacher Login & Studio Access
    // -----------------------------------------------------------------------
    console.log('\n[5/5] Testing Teacher Login & Studio Access...');
    // Click quick teacher credential button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const teacherPreset = btns.find((b) => b.textContent && b.textContent.includes('teacher@openhall.edu'));
      if (teacherPreset) teacherPreset.click();
    });
    await sleep(400);

    // Click submit
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    console.log('   Navigated to destination:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_teacher_studio_authenticated.png') });

    const teacherStudioText = await page.evaluate(() => document.body.innerText);
    const hasTeacherSession = page.url().includes('studio') && teacherStudioText.includes('sign out') && teacherStudioText.includes('teacher');
    console.log('   Teacher Session in Studio Verified:', hasTeacherSession);
    report.push({
      test: '4. Teacher Encrypted Login Flow',
      status: hasTeacherSession ? 'PASS' : 'FAIL',
      details: 'Signed in as teacher at /studio',
    });

  } catch (err) {
    console.error('❌ Authentication Test Error:', err);
    report.push({ test: 'Execution Exception', status: 'FAIL', details: err.message });
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  console.log('\n======================================================');
  console.log('🏁 OPENHALL CREDENTIALS & ENCRYPTION TEST REPORT');
  console.log('======================================================');
  console.table(report);
}

runCredentialsAndEncryptionTests();
