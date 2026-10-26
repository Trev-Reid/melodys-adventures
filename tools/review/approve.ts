/**
 * Approve the latest review photos: they become what "no change" looks like.
 *
 *   npm run review:approve -- garden-house garden-gate    these shots
 *   npm run review:approve -- --all                       every shot photographed
 *
 * Copies art/review/out/current/<shot>.png to art/review/baselines/<shot>.png,
 * and notes in baselines/_setup.json which computer and browser took it.
 * Only approve after looking at the board (npm run review:compare) - and keep
 * the baselines in git, so there's a record of how the game looked.
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASELINES, CURRENT, SETUP_FILE, pickShots, readJson, shotFile, type BaselineSetups, type CaptureSetup } from './paths';

function main(argv: string[]): number {
  const all = argv.includes('--all');
  const names = argv.filter((a) => !a.startsWith('--'));
  if (!all && !names.length) {
    console.log('Say which shots to approve (npm run review:approve -- garden-house), or --all.');
    return 1;
  }
  mkdirSync(BASELINES, { recursive: true });
  const captured = readJson<CaptureSetup>(join(CURRENT, SETUP_FILE));
  const setups = readJson<BaselineSetups>(join(BASELINES, SETUP_FILE)) ?? {};
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  for (const shot of pickShots(all ? [] : names)) {
    const photo = shotFile(CURRENT, shot.name);
    if (!photo) {
      if (!all) console.log(`  ${shot.name}: no photo yet - run npm run review:capture first`);
      continue;
    }
    const had = !!shotFile(BASELINES, shot.name);
    copyFileSync(photo, join(BASELINES, `${shot.name}.png`));
    if (captured) setups[shot.name] = { setup: captured.setup, approved: today };
    else delete setups[shot.name];
    console.log(`  ${shot.name}: ${had ? 'approved (replaces the old one)' : 'approved'}`);
    count++;
  }
  if (count) writeFileSync(join(BASELINES, SETUP_FILE), `${JSON.stringify(setups, null, 2)}\n`);
  console.log(`\n${count} approved, in art/review/baselines/${captured ? ` (taken on ${captured.setup})` : ''}.`);
  return count ? 0 : 1;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
}
