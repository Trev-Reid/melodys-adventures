/**
 * Tiled helpers.
 *
 *   npm run tiled:project    Regenerate melodys-adventures.tiled-project
 *                            (after adding a new collectible/obstacle/scent type)
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tiledProject } from '../../src/levels/tiled/tiledProject';

const root = fileURLToPath(new URL('../../', import.meta.url));
const command = process.argv[2];

if (command === 'project') {
  const path = `${root}melodys-adventures.tiled-project`;
  writeFileSync(path, JSON.stringify(tiledProject(), null, 2) + '\n');
  console.log(`wrote ${path}`);
} else {
  console.log('usage: npm run tiled:project');
  process.exit(1);
}
