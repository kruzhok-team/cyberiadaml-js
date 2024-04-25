import { exportGraphml } from './export';
import { readFileSync } from 'fs';
import { parseCGML } from './import';
import { CGMLElements } from './types/import';

test('test parse-export-parse cycle Bearloga', () => {
  const fileContent: string = readFileSync('demos/autoborder.graphml', 'utf-8');
  const parsed: CGMLElements = parseCGML(fileContent);
  const exported: string = exportGraphml(parsed);
  const parsedAgain: CGMLElements = parseCGML(exported);
  expect(parsedAgain).toStrictEqual(parsed);
});

// test('test parse-export-parse cycle ArduinoUno', () => {
//   const fileContent: string = readFileSync('demos/CyberiadaFormat-Blinker.graphml', 'utf-8');
//   const parsed: CGMLElements = parseCGML(fileContent);
//   const exported: string = exportGraphml(parsed);
//   const parsedAgain: CGMLElements = parseCGML(exported);
//   console.log(parsedAgain);
//   expect(parsed).toStrictEqual(parsedAgain);
// });
