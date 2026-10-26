/**
 * Compares the latest review photos (npm run review:capture) with
 *   - the target for each shot: concept art or a mock-up in art/reference/targets/<shot>.png
 *   - the last approved photo:  art/review/baselines/<shot>.png
 *
 *   npm run review:compare                       every shot photographed
 *   npm run review:compare -- garden-house       just these
 *   npm run review:compare -- --fail-on-change 0.5   exit with an error if any shot changed
 *                                                    more than 0.5% from its approved photo
 *
 * Makes, in art/review/out/:
 *   <shot>-board.png   target | now / approved | what changed - one picture per shot
 *   <shot>-diff.png    the changes on their own (magenta = changed)
 *   report.html        open it in a browser: everything side by side, with a slider
 *   report.md          the numbers
 *
 * Window-size photos (review:capture -- --display 1920x1080) are checked for crispness:
 * at a whole scale every art pixel should come out the same size, with no smoothing.
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { blankImage, readPng, writePng, type RgbaImage } from '../art/png';
import { diffImages, estimatePixelSize, lookStats, type DiffReport, type LookStats } from '../art/analyze';
import { blit, drawText, fill, scaleToFit, textWidth, type Colour } from './imageOps';
import { BASELINES, CURRENT, OUT, SETUP_FILE, TARGETS, pickShots, readJson, shotFile, type BaselineSetups, type CaptureSetup } from './paths';
import type { ReviewShot } from '../../src/review/review';

const W = 960;
const H = 540;
const TITLE = 40;
const LABEL = 32;
const GAP = 4;
const INK: Colour = [235, 235, 240];
const DIM: Colour = [150, 155, 170];
const BG: Colour = [24, 26, 32];
const BAR: Colour = [40, 43, 54];

interface ShotResult {
  shot: ReviewShot;
  hasTarget: boolean;
  hasBaseline: boolean;
  diff?: DiffReport;
  now: LookStats;
  target?: LookStats;
  /** Set when the baseline was taken on a different computer or browser from the latest photo. */
  otherSetup?: string;
  /** How the game looks scaled up to each window size photographed (--display). */
  displays: DisplayCheck[];
}

interface DisplayCheck {
  /** Window size, e.g. "1920x1080". */
  size: string;
  /** How much the browser scales the 960x540 game up. */
  scale: number;
  /** undefined when the scale isn't whole, so art pixels can't all be the same size anyway. */
  crisp?: boolean;
  verdict: string;
}

/** The window-size photos of a shot (art/review/out/current/<shot>@<w>x<h>.png): are the art pixels crisp? */
function displayChecks(shot: string): DisplayCheck[] {
  if (!existsSync(CURRENT)) return [];
  const out: DisplayCheck[] = [];
  for (const file of readdirSync(CURRENT).sort()) {
    const m = file.match(/^(.+)@(\d+)x(\d+)\.png$/);
    if (!m || m[1] !== shot) continue;
    const size = `${m[2]}x${m[3]}`;
    const scale = Math.min(Number(m[2]) / W, Number(m[3]) / H);
    const artPixel = 2 * scale; // screen pixels per art pixel at this size
    const x = `${Number(scale.toFixed(2))}x`;
    if (Math.abs(artPixel - Math.round(artPixel)) > 0.01) {
      out.push({ size, scale, verdict: `${x}: not a whole scale, so art pixels can't all be the same size (some ${Math.floor(artPixel)}, some ${Math.ceil(artPixel)} pixels)` });
      continue;
    }
    const want = Math.round(artPixel);
    const p = estimatePixelSize(readPng(join(CURRENT, file)));
    const crisp = p.size === want;
    out.push({
      size,
      scale,
      crisp,
      verdict: crisp
        ? `${x}: crisp - every art pixel is ${want}x${want} (${Math.round(p.alignment * 100)}% of edges on the grid)`
        : `${x}: SOFT - no clean ${want}x${want} art-pixel grid, so the picture is being smoothed or scaled unevenly (see the rendering reference)`,
    });
  }
  return out;
}

/** Why a change since approved may not be a real change: the baseline came from another setup. */
const setupWarning = (r: ShotResult, now?: string) =>
  r.otherSetup
    ? `taken on a different setup (${r.otherSetup}${now ? `; these photos: ${now}` : ''}), so text and edges may differ without any real change. Before judging, make a fresh baseline here: npm run review:capture, then npm run review:approve -- ${r.shot.name}`
    : '';

function swatches(img: RgbaImage, x: number, y: number, palette: string[]): void {
  palette.slice(0, 8).forEach((hex, i) => {
    const n = parseInt(hex.slice(1), 16);
    fill(img, x + i * 22, y, 18, 18, [0, 0, 0]);
    fill(img, x + i * 22 + 1, y + 1, 16, 16, [n >> 16, (n >> 8) & 255, n & 255]);
  });
}

function emptyPanel(lines: string[]): RgbaImage {
  const p = blankImage(W, H);
  fill(p, 0, 0, W, H, [34, 36, 44]);
  lines.forEach((line, i) => drawText(p, Math.max(8, (W - textWidth(line)) / 2), H / 2 - lines.length * 14 + i * 28, line, DIM));
  return p;
}

function board(result: ShotResult, now: RgbaImage, target?: RgbaImage, baseline?: RgbaImage, diff?: RgbaImage): RgbaImage {
  const { shot } = result;
  const width = W * 2 + GAP;
  const height = TITLE + (LABEL + H) * 2 + GAP;
  const img = blankImage(width, height);
  fill(img, 0, 0, width, height, BG);
  fill(img, 0, 0, width, TITLE, BAR);
  drawText(img, 12, 12, `${shot.name}${shot.note ? ` - ${shot.note}` : ''}`.slice(0, 150), INK);

  const panel = (col: number, row: number, label: string, picture: RgbaImage, palette?: string[]) => {
    const x = col * (W + GAP);
    const y = TITLE + row * (LABEL + H + GAP);
    fill(img, x, y, W, LABEL, BAR);
    drawText(img, x + 10, y + 9, label, INK);
    if (palette) swatches(img, x + W - 8 * 22 - 6, y + 7, palette);
    blit(img, picture, x, y + LABEL);
  };
  const targetPanel = target
    ? scaleToFit(target, W, H)
    : emptyPanel(['NO TARGET YET', 'PUT CONCEPT ART FOR THIS SHOT IN', `ART/REFERENCE/TARGETS/${shot.name}.PNG`]);
  panel(0, 0, 'TARGET (CONCEPT ART)', targetPanel, result.target?.palette);
  panel(1, 0, 'NOW', now, result.now.palette);
  panel(0, 1, 'LAST APPROVED', baseline ?? emptyPanel(['NO APPROVED PHOTO YET', 'WHEN THIS LOOKS RIGHT, RUN', `NPM RUN REVIEW:APPROVE -- ${shot.name}`]));
  const d = result.diff;
  const changeLabel = d ? (d.changed === 0 ? 'CHANGES: NONE' : `CHANGES: ${(d.ratio * 100).toFixed(2)}% OF PIXELS`) : 'CHANGES';
  panel(1, 1, changeLabel, diff ?? emptyPanel(['NOTHING TO COMPARE WITH YET']));
  if (d?.bounds) {
    // Box round the changed area.
    const { x, y, width: bw, height: bh } = d.bounds;
    const ox = W + GAP;
    const oy = TITLE + LABEL + H + GAP + LABEL;
    for (const [rx, ry, rw, rh] of [[x, y, bw, 2], [x, y + bh - 2, bw, 2], [x, y, 2, bh], [x + bw - 2, y, 2, bh]]) fill(img, ox + rx, oy + ry, rw, rh, [255, 230, 0]);
  }
  return img;
}

const f2 = (n: number) => n.toFixed(2);

/** Plain words for how the game's look differs from the target's. */
function lookNotes(now: LookStats, target: LookStats): string[] {
  const notes: string[] = [];
  const say = (d: number, limit: number, more: string, less: string) => {
    if (d > limit) notes.push(more);
    else if (d < -limit) notes.push(less);
  };
  say(target.brightness - now.brightness, 0.05, 'the target is brighter', 'the target is darker');
  say(target.contrast - now.contrast, 0.03, 'the target has more contrast (deeper darks, brighter lights)', 'the target is softer (less contrast)');
  say(target.saturation - now.saturation, 0.06, 'the target is more colourful', 'the target is less colourful (more muted)');
  say(target.detail - now.detail, 0.03, 'the target is busier (more detail and edges)', 'the target is calmer (less detail)');
  return notes;
}

function reportMd(results: ShotResult[], setup?: string): string {
  const lines = [
    '# Art review',
    '',
    `Made ${new Date().toISOString().slice(0, 16).replace('T', ' ')} by \`npm run review:compare\`. Boards: \`<shot>-board.png\`; side by side with a slider: \`report.html\`.`,
    ...(setup ? ['', `Photos taken on: ${setup}.`] : []),
    '',
    '| Shot | Changed vs approved | Brightness now / target | Contrast | Colourfulness | Detail |',
    '|---|---|---|---|---|---|',
  ];
  for (const r of results) {
    const changed = r.diff ? `${(r.diff.ratio * 100).toFixed(2)}%${r.diff.bounds ? ` (x ${r.diff.bounds.x}-${r.diff.bounds.x + r.diff.bounds.width}, y ${r.diff.bounds.y}-${r.diff.bounds.y + r.diff.bounds.height})` : ''}` : 'no approved photo';
    const pair = (k: keyof Omit<LookStats, 'palette'>) => `${f2(r.now[k])}${r.target ? ` / ${f2(r.target[k])}` : ''}`;
    lines.push(`| ${r.shot.name} | ${changed} | ${pair('brightness')} | ${pair('contrast')} | ${pair('saturation')} | ${pair('detail')} |`);
  }
  lines.push('');
  for (const r of results) {
    lines.push(`## ${r.shot.name}`, '', r.shot.note ?? '', '');
    lines.push(`- Main colours now: ${r.now.palette.join(' ')}`);
    if (r.target) {
      lines.push(`- Main colours in the target: ${r.target.palette.join(' ')}`);
      const notes = lookNotes(r.now, r.target);
      lines.push(`- Compared with the target: ${notes.length ? notes.join('; ') : 'similar brightness, contrast, colour and detail'}.`);
    } else lines.push(`- No target yet: add \`art/reference/targets/${r.shot.name}.png\`.`);
    if (!r.hasBaseline) lines.push(`- No approved photo yet: when it looks right, \`npm run review:approve -- ${r.shot.name}\`.`);
    if (r.otherSetup) lines.push(`- **Careful:** the last approved photo was ${setupWarning(r)}.`);
    for (const d of r.displays) lines.push(`- In a ${d.size} window (\`${r.shot.name}@${d.size}.png\`): ${d.verdict}.`);
    lines.push('');
  }
  return lines.join('\n');
}

function reportHtml(results: ShotResult[], setup?: string): string {
  const rel = (file: string) => relative(OUT, file).split('\\').join('/');
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sections = results.map((r) => {
    const now = rel(join(CURRENT, `${r.shot.name}.png`));
    const base = rel(join(BASELINES, `${r.shot.name}.png`));
    const target = rel(join(TARGETS, `${r.shot.name}.png`));
    const swatch = (p: string[]) => p.map((c) => `<span class="sw" style="background:${c}" title="${c}"></span>`).join('');
    const changed = r.diff ? `${(r.diff.ratio * 100).toFixed(2)}% of pixels changed since approved` : 'no approved photo yet';
    const notes = r.target ? lookNotes(r.now, r.target) : [];
    return `
<section>
  <h2>${esc(r.shot.name)}</h2>
  <p class="note">${esc(r.shot.note ?? '')}</p>
  <div class="grid">
    <figure><figcaption>Target ${r.target ? swatch(r.target.palette) : ''}</figcaption>
      ${r.hasTarget ? `<img src="${target}" alt="target">` : `<div class="empty"><div>No target yet.<br>Add <code>art/reference/targets/${esc(r.shot.name)}.png</code></div></div>`}</figure>
    <figure><figcaption>Now ${swatch(r.now.palette)}</figcaption><img src="${now}" alt="now"></figure>
    <figure><figcaption>Approved vs now: ${changed}</figcaption>
      ${r.hasBaseline ? `<div class="flip"><img src="${base}" alt="approved"><img class="over" src="${now}" alt="now"></div>
      <input type="range" min="0" max="100" value="100" aria-label="approved to now"> <span class="hint">slide: approved &harr; now (or click the picture to flip)</span>` : `<div class="empty"><div>No approved photo yet.<br><code>npm run review:approve -- ${esc(r.shot.name)}</code></div></div>`}</figure>
    <figure><figcaption>What changed (magenta)</figcaption>${r.diff ? `<img src="${r.shot.name}-diff.png" alt="changes">` : '<div class="empty">-</div>'}</figure>
  </div>
  ${notes.length ? `<p class="look">Compared with the target: ${esc(notes.join('; '))}.</p>` : ''}
  ${r.otherSetup ? `<p class="warn">Careful: the last approved photo was ${esc(setupWarning(r))}.</p>` : ''}
  ${r.displays.map((d) => `<p class="${d.crisp === false ? 'warn' : 'note'}">In a ${esc(d.size)} window (<a href="${rel(join(CURRENT, `${r.shot.name}@${d.size}.png`))}">photo</a>): ${esc(d.verdict)}.</p>`).join('\n  ')}
</section>`;
  });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Melody's Adventures - art review</title>
<style>
  body { margin: 0; padding: 16px; background: #1b1d24; color: #e8e8ee; font: 15px/1.4 system-ui, sans-serif; }
  h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 18px; margin: 28px 0 2px; }
  .note, .hint { color: #a0a4b4; } .look { color: #ffd479; } .warn { color: #ff9e7a; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 12px; }
  figure { margin: 0; } figcaption { margin: 0 0 4px; color: #c8cad6; }
  img { width: 100%; image-rendering: pixelated; display: block; background: #000; }
  .flip { position: relative; cursor: pointer; } .flip .over { position: absolute; inset: 0; }
  .empty { aspect-ratio: 16 / 9; display: grid; place-items: center; text-align: center; background: #262833; color: #8d91a3; border-radius: 4px; }
  .sw { display: inline-block; width: 14px; height: 14px; margin-left: 3px; vertical-align: -2px; border: 1px solid #000; }
  input[type=range] { width: 60%; vertical-align: middle; }
  code { color: #ffd479; }
</style></head>
<body>
<h1>Melody's Adventures: art review</h1>
<p class="note">Made by <code>npm run review:compare</code>. "Now" is the game as it is; "approved" is the last photo someone was happy with.${setup ? ` Photos taken on: ${esc(setup)}.` : ''}</p>
${sections.join('\n')}
<script>
  for (const s of document.querySelectorAll('section')) {
    const over = s.querySelector('.over'), range = s.querySelector('input[type=range]'), flip = s.querySelector('.flip');
    if (!over) continue;
    range.addEventListener('input', () => { over.style.opacity = range.value / 100; });
    flip.addEventListener('click', () => { range.value = range.value > 50 ? 0 : 100; over.style.opacity = range.value / 100; });
  }
</script>
</body></html>
`;
}

function main(argv: string[]): number {
  const failAt = (() => {
    const i = argv.indexOf('--fail-on-change');
    return i >= 0 ? Number(argv.splice(i, 2)[1]) : undefined;
  })();
  const shots = pickShots(argv.filter((a) => !a.startsWith('--'))).filter((s) => shotFile(CURRENT, s.name));
  if (!shots.length) {
    console.log('No photos to compare yet. Run:  npm run review:capture');
    return 1;
  }
  const setupNow = readJson<CaptureSetup>(join(CURRENT, SETUP_FILE))?.setup;
  const setupsApproved = readJson<BaselineSetups>(join(BASELINES, SETUP_FILE)) ?? {};
  const results: ShotResult[] = [];
  for (const shot of shots) {
    const now = readPng(shotFile(CURRENT, shot.name)!);
    const targetFile = shotFile(TARGETS, shot.name);
    const baselineFile = shotFile(BASELINES, shot.name);
    const target = targetFile ? readPng(targetFile) : undefined;
    const baseline = baselineFile ? readPng(baselineFile) : undefined;
    const diff = baseline ? diffImages(baseline, now) : undefined;
    const approvedOn = setupsApproved[shot.name]?.setup;
    const result: ShotResult = {
      shot,
      hasTarget: !!target,
      hasBaseline: !!baseline,
      diff,
      now: lookStats(now),
      target: target ? lookStats(scaleToFit(target, W, H)) : undefined,
      otherSetup: baseline && approvedOn && setupNow && approvedOn !== setupNow ? approvedOn : undefined,
      displays: displayChecks(shot.name),
    };
    results.push(result);
    if (diff) writePng(join(OUT, `${shot.name}-diff.png`), diff.image);
    writePng(join(OUT, `${shot.name}-board.png`), board(result, now, target, baseline, diff?.image));
    const change = diff ? (diff.changed ? `${(diff.ratio * 100).toFixed(2)}% changed since approved` : 'no change since approved') : 'no approved photo yet';
    console.log(`  ${shot.name.padEnd(20)} ${change}${target ? '' : '  (no target art yet)'}${result.otherSetup ? '  (approved on another setup!)' : ''}`);
    for (const d of result.displays) console.log(`  ${''.padEnd(20)} ${d.size}: ${d.verdict}`);
  }
  writeFileSync(join(OUT, 'report.md'), reportMd(results, setupNow));
  writeFileSync(join(OUT, 'report.html'), reportHtml(results, setupNow));
  const other = results.filter((r) => r.otherSetup);
  if (other.length) {
    console.log(`\nCareful: ${other.map((r) => r.shot.name).join(', ')} ${other.length === 1 ? 'was' : 'were'} approved on ${other[0].otherSetup}, not on this setup (${setupNow}).`);
    console.log('Text and edges can differ between computers and browsers without any real change. Make fresh baselines here first: npm run review:capture, then npm run review:approve -- --all');
  }
  console.log(`\nBoards and report in art/review/out/ - open report.html to look through them.`);
  if (failAt !== undefined) {
    const over = results.filter((r) => r.diff && r.diff.ratio * 100 > failAt);
    if (over.length) {
      console.log(`Changed more than ${failAt}%: ${over.map((r) => r.shot.name).join(', ')}`);
      return 1;
    }
  }
  return 0;
}

console.log('Comparing review photos...');
try {
  process.exitCode = main(process.argv.slice(2));
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
}
