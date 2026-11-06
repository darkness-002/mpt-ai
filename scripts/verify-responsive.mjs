import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const AFTER_DIR = path.resolve('screenshots/after');
fs.mkdirSync(AFTER_DIR, { recursive: true });

async function runVerification() {
  console.log('1. Building app with test environment for preview...');
  // Temporarily write .env.local for the build
  fs.writeFileSync('.env.local', 'VITE_SUPABASE_URL=https://mpt-ai-test.supabase.co\nVITE_SUPABASE_ANON_KEY=testkey123456789\n');

  try {
    const buildRes = spawn('cmd.exe', ['/c', 'npm', 'run', 'build'], { stdio: 'inherit' });
    await new Promise((resolve, reject) => {
      buildRes.on('close', (code) => (code === 0 ? resolve() : reject(new Error('Build failed'))));
    });
  } finally {
    // Immediately remove .env.local so it doesn't affect unit tests or commit
    if (fs.existsSync('.env.local')) fs.unlinkSync('.env.local');
  }

  console.log('2. Starting preview server...');
  const server = spawn('cmd.exe', ['/c', 'npm', 'run', 'preview', '--', '--port', '4173'], { stdio: 'pipe' });

  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://localhost:4173/');
      if (res.ok) {
        console.log('Preview server ready!');
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Route Supabase calls so they return mock data instantly
  await page.route('**/*.supabase.co/**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  const widths = [320, 360, 390, 430, 768, 1280];
  const roles = ['admin', 'editor', 'reviewer', 'contributor'];

  const results = {
    overflowViolations: [],
    headerHeightViolations: [],
    fontSizeViolations: [],
    tapTargetViolations: [],
  };

  async function setRole(r) {
    await page.goto('http://localhost:4173/');
    await page.evaluate((role) => {
      const session = {
        access_token: 'fake-jwt',
        refresh_token: 'fake-refresh',
        expires_at: 9999999999,
        token_type: 'bearer',
        user: {
          id: 'user-admin-1',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'admin@mpt.ai',
          user_metadata: { role },
          app_metadata: { provider: 'email' }
        }
      };
      localStorage.setItem('sb-mpt-ai-test-auth-token', JSON.stringify(session));
      localStorage.setItem('mpt-ai-dev-role', role);
    }, r);
  }

  async function checkLayout(viewName, w) {
    const data = await page.evaluate(({ viewName, w }) => {
      const issues = [];
      const winW = window.innerWidth;
      const scrollW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);

      if (scrollW > winW) {
        issues.push({
          type: 'overflow',
          view: viewName,
          w,
          scrollW,
          winW,
          diff: scrollW - winW,
        });
      }

      const header = document.querySelector('.admin-header');
      let headerH = 0;
      if (header && w < 768) {
        headerH = header.offsetHeight;
        if (headerH > 105) {
          issues.push({
            type: 'header-height',
            view: viewName,
            w,
            headerH,
          });
        }
      }

      // Check input font sizes on mobile (< 768px)
      const smallInputs = [];
      if (w < 768) {
        const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
        for (const inp of inputs) {
          if (inp.offsetParent !== null) {
            const fs = parseFloat(window.getComputedStyle(inp).fontSize);
            if (fs < 15.5) {
              smallInputs.push(`${inp.tagName.toLowerCase()}.${inp.className} (${fs}px)`);
            }
          }
        }
      }

      // Check tap targets on mobile (< 768px)
      const smallTargets = [];
      if (w < 768) {
        const buttons = document.querySelectorAll('button, a.admin-back-btn, select');
        for (const btn of buttons) {
          if (btn.offsetParent !== null) {
            const rect = btn.getBoundingClientRect();
            if (rect.height < 40 || rect.width < 40) {
              const label = (btn.innerText || btn.getAttribute('aria-label') || btn.className || '').trim().slice(0, 20);
              smallTargets.push(`${btn.tagName.toLowerCase()}[${label}]: ${Math.round(rect.width)}x${Math.round(rect.height)}px`);
            }
          }
        }
      }

      return { issues, headerH, scrollW, winW, smallInputs, smallTargets };
    }, { viewName, w });

    for (const is of data.issues) {
      if (is.type === 'overflow') results.overflowViolations.push(is);
      if (is.type === 'header-height') results.headerHeightViolations.push(is);
    }
    for (const inp of data.smallInputs) results.fontSizeViolations.push({ viewName, w, inp });
    for (const tgt of data.smallTargets) results.tapTargetViolations.push({ viewName, w, tgt });

    return data;
  }

  console.log('\n3. Testing Security Gates across viewports...');
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 800 });
    // Unauthenticated gate
    await page.goto('http://localhost:4173/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle' });
    if (w === 390) {
      await page.screenshot({ path: path.join(AFTER_DIR, '390-gate-login.png'), fullPage: true });
    }
    await checkLayout('Gate-Login', w);

    // Access Restricted Gate (Student)
    await setRole('student');
    await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle' });
    if (w === 390) {
      await page.screenshot({ path: path.join(AFTER_DIR, '390-gate-denied.png'), fullPage: true });
    }
    await checkLayout('Gate-Denied', w);
  }

  console.log('\n4. Testing Roles, Tabs & Viewports...');
  for (const role of roles) {
    await setRole(role);
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle' });

      // Dashboard
      await checkLayout(`${role}-Dashboard`, w);
      if (role === 'admin' && w === 390) {
        await page.screenshot({ path: path.join(AFTER_DIR, '390-dashboard.png') });
      }

      // Add Question tab
      const addTab = page.locator('button.admin-tab-btn:has-text("Add")');
      if (await addTab.count() > 0) {
        await addTab.click();
        await page.waitForTimeout(200);
        await checkLayout(`${role}-AddQuestion`, w);
        if (role === 'admin' && w === 390) {
          await page.screenshot({ path: path.join(AFTER_DIR, '390-add-question.png') });
        }
      }

      // Review Queue tab (Cards view)
      const reviewTab = page.locator('button.admin-tab-btn:has-text("Review")');
      if (await reviewTab.count() > 0) {
        await reviewTab.click();
        await page.waitForTimeout(200);
        await checkLayout(`${role}-ReviewQueue-Cards`, w);
        if (role === 'admin' && w === 390) {
          await page.screenshot({ path: path.join(AFTER_DIR, '390-review-queue-cards.png') });
        }

        // Review Queue tab (Question Grid table view)
        const gridBtn = page.locator('button:has-text("Question Grid")');
        if (await gridBtn.count() > 0) {
          await gridBtn.click();
          await page.waitForTimeout(200);
          await checkLayout(`${role}-ReviewQueue-Grid`, w);
          if (role === 'admin' && w === 390) {
            await page.screenshot({ path: path.join(AFTER_DIR, '390-review-queue-table.png') });
          }
        }
      }

      // User Management tab (only admin)
      if (role === 'admin') {
        const usersTab = page.locator('button.admin-tab-btn:has-text("Users")');
        if (await usersTab.count() > 0) {
          await usersTab.click();
          await page.waitForTimeout(200);
          await checkLayout(`${role}-Users`, w);
          if (w === 390) {
            await page.screenshot({ path: path.join(AFTER_DIR, '390-user-management.png') });
          }
        }
      }
    }
  }

  console.log('\n5. Testing Drawers & Modals at 390px...');
  await setRole('admin');
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle' });

  // Open mobile account sheet
  const accountBtn = page.locator('.admin-account-btn');
  if (await accountBtn.count() > 0) {
    await accountBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(AFTER_DIR, '390-account-sheet.png') });
    await page.locator('.admin-account-close').click();
    await page.waitForTimeout(200);
  }

  // Open Add Question slide-out drawer
  const addAction = page.locator('text=Submit New Question');
  if (await addAction.count() > 0) {
    await addAction.click();
    await page.waitForTimeout(300);
    await checkLayout('Drawer-Add', 390);
    await page.screenshot({ path: path.join(AFTER_DIR, '390-drawer-add.png') });

    // Open Create Subject Modal from inside Add drawer
    const createSubBtn = page.locator('.create-subject-trigger-btn').first();
    if (await createSubBtn.count() > 0) {
      await createSubBtn.click();
      await page.waitForTimeout(300);
      await checkLayout('Modal-Subject', 390);
      await page.screenshot({ path: path.join(AFTER_DIR, '390-modal-subject.png') });
      await page.locator('.modal button:has-text("Cancel")').click();
      await page.waitForTimeout(200);
    }

    await page.locator('.drawer-close-btn').first().click();
    await page.waitForTimeout(200);
  }

  // Open Edit Question slide-out drawer
  const reviewTab = page.locator('button.admin-tab-btn:has-text("Review")');
  await reviewTab.click();
  await page.waitForTimeout(300);

  // Switch to cards mode if in grid
  const cardsToggle = page.locator('button:has-text("Cards")');
  if (await cardsToggle.count() > 0) await cardsToggle.click();
  await page.waitForTimeout(200);

  const editBtn = page.locator('button.action-btn.is-edit').first();
  if (await editBtn.count() > 0) {
    await editBtn.click();
    await page.waitForTimeout(300);
    await checkLayout('Drawer-Edit', 390);
    await page.screenshot({ path: path.join(AFTER_DIR, '390-drawer-edit.png') });
    await page.locator('.drawer-close-btn').first().click();
  }

  console.log('\n=============================================');
  console.log('VERIFICATION AUDIT RESULTS');
  console.log('=============================================');
  console.log('Page Overflow Violations:', results.overflowViolations.length);
  for (const o of results.overflowViolations) {
    console.log(`  [OVERFLOW] ${o.view} @ w${o.w}: scrollW=${o.scrollW} > winW=${o.winW} (+${o.diff}px)`);
  }

  console.log('Header Height Violations (> 100px on mobile):', results.headerHeightViolations.length);
  for (const h of results.headerHeightViolations) {
    console.log(`  [HEADER HEIGHT] ${h.view} @ w${h.w}: height = ${h.headerH}px`);
  }

  console.log('Font Size Violations (< 16px on mobile):', results.fontSizeViolations.length);
  const dedupedFonts = Array.from(new Set(results.fontSizeViolations.map((f) => f.inp)));
  for (const f of dedupedFonts) {
    console.log(`  [FONT] ${f}`);
  }

  console.log('Tap Target Violations (< 40px on mobile):', results.tapTargetViolations.length);
  const dedupedTargets = Array.from(new Set(results.tapTargetViolations.map((t) => t.tgt)));
  for (const t of dedupedTargets) {
    console.log(`  [TAP] ${t}`);
  }

  console.log('\nAfter screenshots saved in screenshots/after/ :');
  console.log(fs.readdirSync(AFTER_DIR));

  await browser.close();
  server.kill();
  process.exit(results.overflowViolations.length + results.headerHeightViolations.length);
}

runVerification();
