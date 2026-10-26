/**
 * Photographs the review shots (src/review/shots.json) in a real browser.
 *
 *   npm run review:capture                          every shot
 *   npm run review:capture -- garden-house          just these shots
 *   npm run review:capture -- --display 1920x1080   also photograph the whole window at that
 *                                                   size, to judge how the game scales up
 *   npm run review:capture -- --display 1920x1080,1366x768   ...at several sizes
 *   npm run review:capture -- --url http://localhost:5173   use a game that's already running
 *   npm run review:capture -- --gpu               use the graphics card instead of software drawing
 *                                                 (faster, but photos may differ between computers)
 *
 * Photos go to art/review/out/current/<shot>.png at the game's own size
 * (960x540), with _setup.json saying which computer and browser took them
 * (baselines are only compared exactly on the same setup). Then: npm run review:compare.
 *
 * Needs Playwright, once:  npm i -D playwright
 * (It uses Playwright's own browser if it's installed, otherwise Edge or Chrome.)
 */
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pngInfo } from '../art/png';
import { CURRENT, ROOT, SETUP_FILE, pickShots, type CaptureSetup } from './paths';

interface Page {
  goto(url: string): Promise<unknown>;
  evaluate<T>(fn: string | (() => T | Promise<T>)): Promise<T>;
  waitForTimeout(ms: number): Promise<void>;
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  screenshot(options: { path: string }): Promise<unknown>;
  on(event: string, fn: (arg: { message?: string; type?: () => string; text?: () => string }) => void): void;
  close(): Promise<void>;
}
interface Browser {
  newPage(options: { viewport: { width: number; height: number }; deviceScaleFactor: number }): Promise<Page>;
  version(): string;
  close(): Promise<void>;
}

const FRAME = { width: 960, height: 540 };
// Software graphics: the same pixels on every computer and graphics card.
const BROWSER_ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--mute-audio'];
const OS_NAMES: Record<string, string> = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' };

async function launch(gpu: boolean): Promise<{ browser: Browser; setup: string }> {
  let chromium: { launch(o: object): Promise<Browser> };
  try {
    chromium = createRequire(import.meta.url)('playwright').chromium;
  } catch {
    throw new Error('Screenshots need Playwright. Run this once:  npm i -D playwright');
  }
  const tries: { channel?: string }[] = [{}, { channel: 'msedge' }, { channel: 'chrome' }];
  let last: unknown;
  for (const t of tries) {
    try {
      const browser = await chromium.launch({ headless: true, args: gpu ? ['--mute-audio'] : BROWSER_ARGS, ...t });
      // Major.minor is enough: patch releases don't change how text and edges are drawn.
      const version = browser.version().split('.').slice(0, 2).join('.');
      const setup = `${OS_NAMES[process.platform] ?? process.platform} · ${t.channel ?? 'chromium'} ${version} · ${gpu ? 'graphics card' : 'software drawing'}`;
      return { browser, setup };
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`Couldn't start a browser (tried Playwright's Chromium, Edge and Chrome). Run:  npx playwright install chromium\n${(last as Error)?.message ?? ''}`);
}

async function startServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT, logLevel: 'warn', server: { port: 5288, strictPort: false, open: false } });
  await server.listen();
  const url = server.resolvedUrls?.local[0] ?? 'http://localhost:5288/';
  return { url, close: () => server.close() };
}

async function main(argv: string[]): Promise<number> {
  const arg = (name: string) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv.splice(i, 2)[1] : undefined;
  };
  const gpu = argv.includes('--gpu');
  const display = arg('--display');
  const givenUrl = arg('--url');
  const shots = pickShots(argv.filter((a) => !a.startsWith('--')));
  const displaySizes = (display ?? '').split(',').filter(Boolean).map((d) => {
    const m = d.trim().match(/^(\d+)x(\d+)$/);
    if (!m) throw new Error('--display wants window sizes like 1920x1080 (or 1920x1080,1366x768)');
    return { width: Number(m[1]), height: Number(m[2]) };
  });

  mkdirSync(CURRENT, { recursive: true });
  const server = givenUrl ? { url: givenUrl, close: async () => undefined } : await startServer();
  const { browser, setup } = await launch(gpu);
  console.log(`  (${setup})`);
  const saved: string[] = [];
  let failures = 0;
  try {
    for (const shot of shots) {
      const page = await browser.newPage({ viewport: FRAME, deviceScaleFactor: 1 });
      const problems: string[] = [];
      page.on('pageerror', (e) => problems.push(e.message ?? String(e)));
      page.on('console', (m) => m.type?.() === 'error' && problems.push(m.text?.() ?? ''));
      const started = Date.now();
      await page.goto(`${server.url.replace(/\/$/, '')}/?review=${encodeURIComponent(shot.name)}`);
      let state: { ready: boolean; error?: string } | null = null;
      while (Date.now() - started < 120_000) {
        state = await page.evaluate(() => (window.__review ? { ready: window.__review.ready, error: window.__review.error } : null));
        if (state?.ready || state?.error) break;
        await page.waitForTimeout(250);
      }
      if (!state?.ready) {
        failures++;
        console.log(`  ${shot.name}: FAILED - ${state?.error ?? 'the game never got ready'}${problems.length ? `\n    ${problems.slice(0, 3).join('\n    ')}` : ''}`);
        await page.close();
        continue;
      }
      const dataUrl = await page.evaluate(() => window.__review!.capture());
      const png = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      const info = pngInfo(png);
      const file = join(CURRENT, `${shot.name}.png`);
      writeFileSync(file, png);
      saved.push(shot.name);
      // Window photos from an earlier run would be judged as if they were this one's.
      for (const old of readdirSync(CURRENT)) if (old.startsWith(`${shot.name}@`) && old.endsWith('.png')) unlinkSync(join(CURRENT, old));
      let extra = '';
      for (const { width: w, height: h } of displaySizes) {
        // What a player sees on a bigger screen: the browser scaling the game up.
        await page.setViewportSize({ width: w, height: h });
        await page.evaluate(() => window.__review!.advance(3));
        await page.screenshot({ path: join(CURRENT, `${shot.name}@${w}x${h}.png`) });
        extra += ` + ${shot.name}@${w}x${h}.png`;
      }
      const size = info.width === FRAME.width && info.height === FRAME.height ? '' : ` (unexpected size ${info.width}x${info.height})`;
      console.log(`  ${shot.name}.png${extra}${size}  ${((Date.now() - started) / 1000).toFixed(1)}s${problems.length ? `  - ${problems.length} error(s) in the page: ${problems[0]}` : ''}`);
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
  const record: CaptureSetup = { setup, captured: new Date().toISOString(), shots: saved };
  writeFileSync(join(CURRENT, SETUP_FILE), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`\n${shots.length - failures} of ${shots.length} shots saved in art/review/out/current/. Next: npm run review:compare`);
  return failures ? 1 : 0;
}

console.log('Photographing review shots...');
main(process.argv.slice(2)).then(
  (code) => (process.exitCode = code),
  (e) => {
    console.error((e as Error).message);
    process.exitCode = 1;
  },
);
