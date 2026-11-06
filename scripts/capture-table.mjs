import { spawn } from 'child_process';
import path from 'path';
import { chromium } from 'playwright';

const BEFORE_DIR = path.resolve('screenshots/before');

async function captureTable() {
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
  await page.route('**/*.supabase.co/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
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

  // Go to Review Queue
  await page.locator('button.admin-tab-btn:has-text("Review Queue")').click();
  const tableToggle = page.locator('button:has-text("Question Grid")').first();
  await tableToggle.waitFor({ state: 'visible', timeout: 5000 });
  await tableToggle.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(BEFORE_DIR, '390-review-queue-table.png') });
  console.log('Saved 390-review-queue-table.png');

  await browser.close();
  server.kill();
  process.exit(0);
}

captureTable();
