/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The documents this library writes, for the contract tests of cyberiadaml-py
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

// Usage: npm run build && node tools/write-contract.mjs OUTPUT_DIR
// writes OUTPUT_DIR/js-<version>/: every positive standard example and every valid Lapki
// document read by parseCGML and written by exportGraphml, with its canonical dump
/* eslint-env node */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLES = join(ROOT, 'tests', 'examples');
const lib = createRequire(import.meta.url)(join(ROOT, 'dist', 'index.js'));

const output = process.argv[2];
if (!output) {
  console.error('usage: node tools/write-contract.mjs OUTPUT_DIR');
  process.exit(64);
}
const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
const target = join(output, `js-${version}`);
rmSync(target, { recursive: true, force: true });

const json = (path) => JSON.parse(readFileSync(path, 'utf-8'));
const fixtures = json(join(EXAMPLES, 'standard', 'manifest.json')).fixtures;
const corpus = json(join(EXAMPLES, 'lapki', 'manifest.json')).documents;
const sources = [
  ...Object.keys(fixtures)
    .filter((name) => fixtures[name].reject === undefined)
    .map((name) => ['standard', name, true]),
  ...Object.keys(corpus)
    .filter((name) => corpus[name].status === 'valid')
    .map((name) => ['lapki', name, false]),
].sort();

const documents = [];
for (const [dir, name, strict] of sources) {
  const text = readFileSync(join(EXAMPLES, dir, `${name}.graphml`), 'utf-8');
  const written = lib.exportGraphml(lib.parseCGML(text, { strict }));
  const dump = lib.core.dump(lib.core.read(written, { strict: true }));
  const path = join(target, dir, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.graphml`, written);
  writeFileSync(`${path}.expected.txt`, dump);
  documents.push(`${dir}/${name}`);
}

const revision = execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], {
  encoding: 'utf-8',
}).trim();
const examples = readFileSync(join(EXAMPLES, 'REVISION'), 'utf-8').trim();
writeFileSync(
  join(target, 'manifest.json'),
  JSON.stringify({ library: 'cyberiadaml-js', version, revision, examples, documents }, null, 1) +
    '\n',
);
writeFileSync(
  join(target, 'README.md'),
  `# Documents written by cyberiadaml-js ${version}

Written by \`tools/write-contract.mjs\` of cyberiadaml-js ${revision}: every positive standard
example (\`standard/\`, read strictly) and every valid Lapki dialect document (\`lapki/\`) read
by \`parseCGML\` and written by \`exportGraphml\`, with the canonical dump cyberiadaml-js gives for
the written document (\`.expected.txt\`). The sources are the examples of ${examples}.

Licences: the documents are derived from those examples and keep their licences: \`standard/\`
comes from cyberiadaml-compat-tests under the GNU General Public License (version 3); the
\`lapki/\` documents keep the licences of their repositories, listed in the README of the Lapki
corpus of cyberiadaml-compat-tests (\`fixtures/dialect/lapki/README.md\`).
`,
);
console.log(`${documents.length} documents written to ${target}`);
