# The test examples

A snapshot of cyberiadaml-compat-tests, refreshed with `tools/sync-examples.mjs`; the source
revision is in `REVISION`. A refresh is a commit of its own.

* `standard/` - the conformance examples of the standard and their `manifest.json`: positive
  documents with their canonical dumps (`.expected.txt`), negative ones (`negative/`) with the
  requirement they break;
* `lapki/` - the Lapki dialect corpus: documents, expected repairs and dumps, see
  `lapki/README.md`.

Licences: `standard/` comes from cyberiadaml-compat-tests under the GNU General Public License
(version 3); the `lapki/` documents keep the licences of their repositories, listed in
`lapki/README.md`.
