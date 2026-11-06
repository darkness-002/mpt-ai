import { spawn } from 'child_process';
import path from 'path';
import { chromium } from 'playwright';

const BEFORE_DIR = path.resolve('screenshots/before');

async function capture() {
  const server = spawn('cmd.exe', ['/c', 'npm', 'run', 'preview', '--', '--port', '4173'], { stdio: 'pipe' });
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://localhost:4173/');
      if (res.ok) break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 800 });

  await page.goto('http://localhost:4173/');
  await page.evaluate(() => {
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
        user_metadata: { role: 'admin' },
        app_metadata: { provider: 'email' }
      }
    };
    localStorage.setItem('sb-mpt-ai-demo-auth-token', JSON.stringify(session));
    localStorage.setItem('mpt-ai-dev-role', 'admin');
  });

  await page.goto('http://localhost:4173/admin', { waitUntil: 'networkidle' });

  // Add drawer
  const addAction = page.locator('text=Submit New Question');
  if (await addAction.count() > 0) {
    await addAction.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(BEFORE_DIR, '390-drawer-add.png') });
    console.log('Saved 390-drawer-add.png');

    // Create subject modal inside drawer
    const createSub = page.locator('.create-subject-trigger-btn');
    if (await createSub.count() > 0) {
      await createSub.first().click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(BEFORE_DIR, '390-modal-subject.png') });
      console.log('Saved 390-modal-subject.png');
      const cancel = page.locator('.modal button:has-text("Cancel")');
      if (await cancel.count() > 0) await cancel.click();
    }
    const closeDrawer = page.locator('.drawer-close-btn');
    if (await closeDrawer.count() > 0) await closeDrawer.click();
  }

  // Edit drawer: navigate to Review Queue
  await page.locator('button.admin-tab-btn:has-text("Review Queue")').click();
  await page.waitForTimeout(400);
  const editBtn = page.locator('button.action-btn.is-edit, button:has-text("Edit")').first();
  if (await editBtn.count() > 0) {
    await editBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(BEFORE_DIR, '390-drawer-edit.png') });
    console.log('Saved 390-drawer-edit.png');
  }

  await browser.close();
  server.kill();
  process.exit(0);
}

capture();
