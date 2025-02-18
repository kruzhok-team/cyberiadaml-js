import { readFileSync } from 'fs';

import { exportGraphml, exportTextGraphml } from './export';
import { parseCGML, parseTextCGML } from './import';
import { CGMLElements, CGMLTextElements } from './types/import';

describe('test parse-export-parse cycle', () => {
  it.each([
    ['demos/arduino-blinker.graphml'],
    ['demos/autoborder.graphml'],
    ['demos/two-blinkers.graphml'],
    ['demos/with-empty-state.graphml'],
    ['demos/20-cyb-geometry.test-input.graphml'],
    ['demos/21-cyb-geometry2.test-input.graphml'],
    ['demos/23-cyb-autoborder.test-input.graphml'],
    ['demos/nested.graphml'],
  ])(`parsing demo %p`, (path) => {
    const fileContent: string = readFileSync(path, 'utf-8');
    const parsed: CGMLElements = parseCGML(fileContent);
    const exported: string = exportGraphml(parsed);
    const parsedAgain: CGMLElements = parseCGML(exported);
    expect(parsedAgain).toStrictEqual(parsed);
  });
});

test('test parse-export-parse cycle ArduinoUno with textMode', () => {
  const fileContent: string = readFileSync('demos/arduino-blinker.graphml', 'utf-8');
  const parsed: CGMLTextElements = parseTextCGML(fileContent);
  const exported: string = exportTextGraphml(parsed);
  const parsedAgain: CGMLTextElements = parseTextCGML(exported);
  expect(parsedAgain).toStrictEqual(parsed);
});
