import { exportGraphml } from './export';
import { readFileSync } from 'fs';
import { parseCGML } from './import';
import { CGMLElements } from './types/import';

test('test parse-export-parse cycle', () => {
  const fileContent: string = readFileSync('demos/CyberiadaFormat-Autoborder.graphml', 'utf-8');
  const parsed: CGMLElements = parseCGML(fileContent);
  console.log(parsed)
  const exported: string = exportGraphml(parsed);
  const parsedAgain: CGMLElements = parseCGML(exported);
  console.log(exported);
  expect(parsed).toStrictEqual(parsedAgain);
});
