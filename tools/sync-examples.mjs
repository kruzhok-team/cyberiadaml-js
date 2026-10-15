/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The snapshot of the conformance examples and the Lapki dialect corpus
 *
 * Copyright (C) 2026 Alexey Fedoseev <aleksey@fedoseev.net>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/
 *
 * ----------------------------------------------------------------------------- */

// Usage: node tools/sync-examples.mjs [COMPAT_TESTS_DIR]
/* eslint-env node */

import { execFileSync } from 'node:child_process';
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLES = join(ROOT, 'tests', 'examples');
const STANDARD_DIRS = ['core', 'ext', 'field', 'geometry', 'negative', 'standard'];

const compat = process.argv[2] ?? join(homedir(), 'sources', 'cyberiadaml-compat-tests');
const fixtures = join(compat, 'fixtures');
const standard = join(EXAMPLES, 'standard');
const lapki = join(EXAMPLES, 'lapki');

for (const target of [standard, lapki]) {
  rmSync(target, { recursive: true, force: true });
}
for (const name of STANDARD_DIRS) {
  cpSync(join(fixtures, name), join(standard, name), { recursive: true });
}
cpSync(join(fixtures, 'manifest.json'), join(standard, 'manifest.json'));
cpSync(join(fixtures, 'dialect', 'lapki'), lapki, { recursive: true });
const revision = execFileSync('git', ['-C', compat, 'rev-parse', 'HEAD'], {
  encoding: 'utf-8',
}).trim();
writeFileSync(join(EXAMPLES, 'REVISION'), `cyberiadaml-compat-tests ${revision}\n`);
console.log(`tests/examples from cyberiadaml-compat-tests ${revision}`);
