import { exportGraphml, exportTextGraphml } from './export';
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

test('test parse-export-parse cycle ArduinoUno', () => {
  const fileContent: string = readFileSync('demos/arduino-blinker.graphml', 'utf-8');
  const parsed: CGMLElements = parseCGML(fileContent);
  const exported: string = exportGraphml(parsed);
  const parsedAgain: CGMLElements = parseCGML(exported);
  expect(parsedAgain).toStrictEqual(parsed);
});

test('test parse-export-parse cycle multidoc ArduinoUno', () => {
  const fileContent: string = readFileSync('demos/two-blinkers.graphml', 'utf-8');
  const parsed: CGMLElements = parseCGML(fileContent);
  const exported: string = exportGraphml(parsed);
  const parsedAgain: CGMLElements = parseCGML(exported);
  expect(parsedAgain).toStrictEqual(parsed);
});

test('test parse-export-parse cycle with empty state', () => {
  const fileContent: string = readFileSync('demos/with-empty-state.graphml', 'utf-8');
  const parsed: CGMLElements = parseCGML(fileContent);
  const exported: string = exportGraphml(parsed);
  const parsedAgain: CGMLElements = parseCGML(exported);
  expect(parsedAgain).toStrictEqual(parsed);
});

// test('test parse-export-parse cycle ArduinoUno with textMode', () => {
//   const fileContent: string = readFileSync('demos/arduino-blinker.graphml', 'utf-8');
//   const parsed: CGMLTextElements = parseTextCGML(fileContent);
//   const exported: string = exportTextGraphml(parsed);
//   const parsedAgain: CGMLTextElements = parseTextCGML(exported);
//   expect(parsedAgain).toStrictEqual(parsed);
// });
