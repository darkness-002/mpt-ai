import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const BEFORE_DIR = path.resolve('screenshots/before');
fs.mkdirSync(BEFORE_DIR, { recursive: true });

async function runAudit() {
  console.log('Starting preview server...');
  const server = spawn('cmd.exe', ['/c', 'npm', 'run', 'preview', '--', '--port', '4173'], { stdio: 'pipe' });

  // Wait for server to be responsive
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

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const widths = [320, 360, 390, 430];
    const roles = ['admin', 'editor', 'reviewer', 'contributor'];

    const auditResults = {
      headerIssues: [],
      overflowIssues: [],
      tapTargetIssues: [],
      fontSizeIssues: [],
      drawerModalIssues: [],
    };

    // Helper to setup auth session
    async function setupSession(role = 'admin') {
      await page.goto('http://localhost:4173/');
      await page.evaluate((r) => {
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
            user_metadata: { role: r },
            app_metadata: { provider: 'email' }
          }
        };
        localStorage.setItem('sb-mpt-ai-demo-auth-token', JSON.stringify(session));
        localStorage.setItem('mpt-ai-dev-role', r);
      }, role);
    }

    // Helper to evaluate layout metrics
    async function evaluateLayout(label, width) {
      return await page.evaluate(({ label, width }) => {
        const issues = [];
        const winWidth = window.innerWidth;
        const docScrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);

        if (docScrollWidth > winWidth + 1) {
          issues.push({
            type: 'page-overflow',
            label,
            width,
            docScrollWidth,
            winWidth,
            diff: docScrollWidth - winWidth,
          });
        }

        // Check header height if present
        const header = document.querySelector('.admin-header');
        let headerHeight = null;
        if (header) {
          headerHeight = header.offsetHeight;
          if (headerHeight > 105) {
            issues.push({
              type: 'header-too-tall',
              label,
              width,
              headerHeight,
            });
          }
        }

        // Find elements spilling outside right edge
        const allElements = document.querySelectorAll('*');
        const overflowingElements = [];
        for (const el of allElements) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.right > winWidth + 2) {
            const tag = el.tagName.toLowerCase();
            const cls = (el.className && typeof el.className === 'string') ? el.className.split(' ').slice(0, 2).join('.') : '';
            overflowingElements.push(`${tag}${cls ? '.' + cls : ''} (w: ${Math.round(rect.width)}, r: ${Math.round(rect.right)})`);
          }
        }
        if (overflowingElements.length > 0) {
          issues.push({
            type: 'element-overflow',
            label,
            width,
            elements: Array.from(new Set(overflowingElements)).slice(0, 8),
          });
        }

        // Check interactive tap targets < 44px
        const interactive = document.querySelectorAll('button, a, select, input, textarea');
        const smallTargets = [];
        const smallFontInputs = [];
        for (const el of interactive) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && el.offsetParent !== null) {
            if (rect.height < 44 || rect.width < 44) {
              const text = (el.innerText || el.placeholder || el.value || el.getAttribute('aria-label') || el.className || '').trim().slice(0, 20);
              smallTargets.push(`${el.tagName.toLowerCase()}[${text}]: ${Math.round(rect.width)}x${Math.round(rect.height)}px`);
            }
          }

          if (['input', 'select', 'textarea'].includes(el.tagName.toLowerCase()) && el.offsetParent !== null) {
            const fs = parseFloat(window.getComputedStyle(el).fontSize);
            if (fs < 15.5) {
              const text = (el.placeholder || el.name || el.className || '').slice(0, 25);
              smallFontInputs.push(`${el.tagName.toLowerCase()}.${text} (${fs}px)`);
            }
          }
        }

        return {
          issues,
          headerHeight,
          docScrollWidth,
          winWidth,
          smallTargets: Array.from(new Set(smallTargets)),
          smallFontInputs: Array.from(new Set(smallFontInputs)),
        };
      }, { label, width });
    }

    console.log('--- AUDITING GATES ---');
    // Audit Security Gate (!user)
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto('http://localhost:4173/');
      await page.evaluate(() => localStorage.clear());
      await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle' });
      if (w === 390) {
        await page.screenshot({ path: path.join(BEFORE_DIR, '390-gate-login.png'), fullPage: true });
      }
      const data = await evaluateLayout(`Gate-Login`, w);
      if (data.issues.length) auditResults.overflowIssues.push(...data.issues);
    }

    // Audit Security Gate (user && !isStaff, e.g. student)
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 800 });
      await setupSession('student');
      await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle' });
      if (w === 390) {
        await page.screenshot({ path: path.join(BEFORE_DIR, '390-gate-denied.png'), fullPage: true });
      }
      const data = await evaluateLayout(`Gate-Denied`, w);
      if (data.issues.length) auditResults.overflowIssues.push(...data.issues);
    }

    console.log('--- AUDITING ROLES AND TABS ---');
    for (const role of roles) {
      console.log(`Auditing Role: ${role}...`);
      await setupSession(role);

      for (const w of widths) {
        await page.setViewportSize({ width: w, height: 800 });
        await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle' });

        // Tab: Dashboard
        const dashData = await evaluateLayout(`${role}-w${w}-Dashboard`, w);
        if (dashData.issues.length) auditResults.overflowIssues.push(...dashData.issues);
        if (dashData.headerHeight > 105) auditResults.headerIssues.push({ role, w, height: dashData.headerHeight });
        auditResults.tapTargetIssues.push(...dashData.smallTargets);
        auditResults.fontSizeIssues.push(...dashData.smallFontInputs);

        if (role === 'admin' && w === 390) {
          await page.screenshot({ path: path.join(BEFORE_DIR, '390-dashboard.png'), fullPage: true });
        }

        // Tab: Add Question
        const addTabBtn = page.locator('button.admin-tab-btn:has-text("Add Question")');
        if (await addTabBtn.count() > 0) {
          await addTabBtn.click();
          await page.waitForTimeout(200);
          const addData = await evaluateLayout(`${role}-w${w}-AddQuestion`, w);
          if (addData.issues.length) auditResults.overflowIssues.push(...addData.issues);
          auditResults.tapTargetIssues.push(...addData.smallTargets);
          auditResults.fontSizeIssues.push(...addData.smallFontInputs);

          if (role === 'admin' && w === 390) {
            await page.screenshot({ path: path.join(BEFORE_DIR, '390-add-question.png'), fullPage: true });
          }
        }

        // Tab: Review Queue
        const reviewTabBtn = page.locator('button.admin-tab-btn:has-text("Review Queue")');
        if (await reviewTabBtn.count() > 0) {
          await reviewTabBtn.click();
          await page.waitForTimeout(200);
          const reviewData = await evaluateLayout(`${role}-w${w}-ReviewQueue-Cards`, w);
          if (reviewData.issues.length) auditResults.overflowIssues.push(...reviewData.issues);
          auditResults.tapTargetIssues.push(...reviewData.smallTargets);

          if (role === 'admin' && w === 390) {
            await page.screenshot({ path: path.join(BEFORE_DIR, '390-review-queue-cards.png'), fullPage: true });
          }

          // Switch to Table view in Review Queue if view mode toggle exists
          const tableBtn = page.locator('button.view-mode-btn[title*="Table"], button:has-text("Table")').first();
          if (await tableBtn.count() > 0) {
            await tableBtn.click();
            await page.waitForTimeout(200);
            const tableData = await evaluateLayout(`${role}-w${w}-ReviewQueue-Table`, w);
            if (tableData.issues.length) auditResults.overflowIssues.push(...tableData.issues);
            if (role === 'admin' && w === 390) {
              await page.screenshot({ path: path.join(BEFORE_DIR, '390-review-queue-table.png'), fullPage: true });
            }
          }
        }

        // Tab: Users (only admin has this)
        if (role === 'admin') {
          const usersTabBtn = page.locator('button.admin-tab-btn:has-text("User Management")');
          if (await usersTabBtn.count() > 0) {
            await usersTabBtn.click();
            await page.waitForTimeout(200);
            const usersData = await evaluateLayout(`${role}-w${w}-Users`, w);
            if (usersData.issues.length) auditResults.overflowIssues.push(...usersData.issues);
            auditResults.tapTargetIssues.push(...usersData.smallTargets);
            auditResults.fontSizeIssues.push(...usersData.smallFontInputs);

            if (w === 390) {
              await page.screenshot({ path: path.join(BEFORE_DIR, '390-user-management.png'), fullPage: true });
            }
          }
        }
      }
    }

    console.log('--- AUDITING DRAWERS & MODALS ---');
    await setupSession('admin');
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle' });

    // Open Add Question Drawer
    // Can click action card or header button
    const addDrawerCard = page.locator('.action-card:has-text("Add Question"), button:has-text("Add Single Question")').first();
    if (await addDrawerCard.count() > 0) {
      await addDrawerCard.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(BEFORE_DIR, '390-drawer-add.png'), fullPage: false });
      const addDrawerData = await evaluateLayout('Drawer-Add', 390);
      if (addDrawerData.issues.length) auditResults.drawerModalIssues.push(...addDrawerData.issues);
      auditResults.tapTargetIssues.push(...addDrawerData.smallTargets);
      auditResults.fontSizeIssues.push(...addDrawerData.smallFontInputs);

      // Also try opening Create Subject Modal from inside drawer
      const newSubBtn = page.locator('.create-subject-trigger-btn').first();
      if (await newSubBtn.count() > 0) {
        await newSubBtn.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(BEFORE_DIR, '390-modal-subject.png'), fullPage: false });
        const modalData = await evaluateLayout('Modal-Subject', 390);
        if (modalData.issues.length) auditResults.drawerModalIssues.push(...modalData.issues);
        // Close modal
        const cancelBtn = page.locator('.modal button:has-text("Cancel")');
        if (await cancelBtn.count() > 0) await cancelBtn.click();
      }

      // Close drawer
      const closeDrawerBtn = page.locator('.drawer-close-btn').first();
      if (await closeDrawerBtn.count() > 0) await closeDrawerBtn.click();
      await page.waitForTimeout(200);
    }

    // Open Edit Question Drawer
    // Go to Review Queue or Dashboard where edit button exists
    const editBtn = page.locator('button.action-btn.is-edit').first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(BEFORE_DIR, '390-drawer-edit.png'), fullPage: false });
      const editDrawerData = await evaluateLayout('Drawer-Edit', 390);
      if (editDrawerData.issues.length) auditResults.drawerModalIssues.push(...editDrawerData.issues);
      auditResults.tapTargetIssues.push(...editDrawerData.smallTargets);
      auditResults.fontSizeIssues.push(...editDrawerData.smallFontInputs);
      const closeEdit = page.locator('.drawer-close-btn').first();
      if (await closeEdit.count() > 0) await closeEdit.click();
    }

    // Deduplicate issues
    auditResults.tapTargetIssues = Array.from(new Set(auditResults.tapTargetIssues)).slice(0, 30);
    auditResults.fontSizeIssues = Array.from(new Set(auditResults.fontSizeIssues));

    console.log('\n=============================================');
    console.log('AUDIT SUMMARY REPORT');
    console.log('=============================================');
    console.log('Header height issues (> 105px on mobile):', auditResults.headerIssues.length);
    for (const h of auditResults.headerIssues.slice(0, 8)) {
      console.log(`  Role ${h.role} @ w${h.w}: Header height = ${h.height}px`);
    }

    console.log('\nPage / Element Overflow issues:', auditResults.overflowIssues.length);
    for (const o of auditResults.overflowIssues.slice(0, 15)) {
      if (o.type === 'page-overflow') {
        console.log(`  [OVERFLOW] ${o.label} (w=${o.width}): docScrollWidth=${o.docScrollWidth} > winWidth=${o.winWidth} (+${o.diff}px)`);
      } else if (o.type === 'element-overflow') {
        console.log(`  [OVERFLOW] ${o.label} (w=${o.width}) overflowing elements:`, o.elements);
      }
    }

    console.log('\nFont size issues (< 16px causing iOS zoom):', auditResults.fontSizeIssues.length);
    for (const f of auditResults.fontSizeIssues) {
      console.log(`  [FONT] ${f}`);
    }

    console.log('\nTap target issues (< 44px height or width):', auditResults.tapTargetIssues.length);
    for (const t of auditResults.tapTargetIssues.slice(0, 20)) {
      console.log(`  [TAP] ${t}`);
    }

    console.log('\nScreenshots saved in screenshots/before/ :');
    console.log(fs.readdirSync(BEFORE_DIR));

    fs.writeFileSync('audit-report.json', JSON.stringify(auditResults, null, 2));

    await browser.close();
  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    server.kill();
    process.exit(0);
  }
}

runAudit();
