import { readFileSync } from 'fs';

import { parseCGML, parseTextCGML } from './import';
import { CGMLElements, CGMLTextElements } from './types/import';

test('test parsing arduino', () => {
  const arduinoDemo: string = readFileSync('demos/arduino-blinker.graphml', 'utf-8');
  const predicted: CGMLElements = {
    stateMachines: {
      G: {
        name: 'Моя любимая машина состояний!',
        states: {
          diod1: {
            name: 'Включен',
            bounds: {
              x: 82,
              y: 57,
              width: 450,
              height: 95,
            },
            actions: [
              {
                trigger: {
                  event: 'entry',
                  condition: undefined,
                  postfix: 'propagate',
                },
                action: 'LED1.on()\ntimer1.start(1000)',
              },
            ],
            unsupportedDataNodes: [],
          },
          diod2: {
            name: 'Выключен',
            bounds: {
              x: 81,
              y: 334,
              width: 450,
              height: 95,
            },
            actions: [
              {
                trigger: {
                  event: 'entry',
                  condition: undefined,
                  postfix: undefined,
                },
                action: 'LED1.off()\ntimer1.start(1000)',
              },
            ],
            unsupportedDataNodes: [],
          },
        },
        transitions: {
          'init-edge': {
            id: 'init-edge',
            source: 'init',
            color: '#F29727',
            target: 'diod1',
            actions: [],
            pivot: undefined,
            labelPosition: undefined,
            unsupportedDataNodes: [],
          },
          edge3: {
            id: 'edge3',
            source: 'diod1',
            target: 'diod2',
            actions: [
              {
                trigger: {
                  event: 'timer1.timeout',
                  condition: undefined,
                  postfix: undefined,
                },
                action: undefined,
              },
            ],
            pivot: undefined,
            unsupportedDataNodes: [],
            labelPosition: {
              x: 457,
              y: 173,
            },
            color: '#F29727',
          },
          edge4: {
            id: 'edge4',
            source: 'diod2',
            target: 'diod1',
            actions: [
              {
                trigger: {
                  event: undefined,
                  condition: 'condition',
                },
                action: 'blabla',
              },
            ],
            pivot: undefined,
            unsupportedDataNodes: [],
            labelPosition: {
              x: 16,
              y: 175,
            },
            color: '#F24C3D',
          },
        },
        initialStates: {
          init: {
            data: '',
            type: 'initial',
          },
        },
        components: {
          cLED1: {
            id: 'LED1',
            type: 'LED',
            order: 0,
            parameters: {
              name: 'Светодиод',
              description: 'Встроенный в плату светодиод, чтобы им мигать',
              pin: '12',
            },
            unsupportedDataNodes: [],
          },
          ctimer1: {
            id: 'timer1',
            type: 'Timer',
            order: 1,
            parameters: {
              name: 'Таймер',
              description: 'Программный таймер.',
            },
            unsupportedDataNodes: [
              {
                content: `x/ 12
y/ 13`,
                key: 'dLapkiSchemePosition',
                rect: undefined,
                point: undefined,
              },
            ],
          },
        },
        notes: {
          commentX: {
            name: undefined,
            type: 'informal',
            position: {
              x: 640,
              y: 114,
            },
            text: 'Включение и выключение лампочки по таймеру!',
            unsupportedDataNodes: [
              {
                content: `x/ 12
y/ 13`,
                key: 'dLapkiSchemePosition',
                rect: undefined,
                point: undefined,
              },
            ],
          },
        },
        choices: {},
        terminates: {},
        finals: {},
        unknownVertexes: {},
        standardVersion: '1.0',
        platform: 'ArduinoUno',
        meta: {
          values: {
            name: 'Arduino Blinker',
            author: 'Lapki IDE TEAM',
            description: 'Включение и выключение лампочки по таймеру',
          },
          id: 'coreMeta',
        },
      },
    },
    format: 'Cyberiada-GraphML-1.0',
    keys: [
      {
        id: 'gFormat',
        for: 'graphml',
        'attr.name': 'format',
        'attr.type': 'string',
      },
      {
        id: 'dName',
        for: 'node',
        'attr.name': 'name',
        'attr.type': 'string',
      },
      {
        id: 'dVertex',
        for: 'node',
        'attr.name': 'vertex',
        'attr.type': 'string',
      },
      {
        id: 'dStateMachine',
        for: 'graph',
        'attr.name': 'stateMachine',
        'attr.type': 'string',
      },
      {
        id: 'dGeometry',
        for: 'node',
        'attr.name': 'geometry',
        'attr.type': undefined,
      },
      {
        id: 'dLabelGeometry',
        for: 'edge',
        'attr.name': 'labelGeometry',
        'attr.type': undefined,
      },
      {
        id: 'dPivot',
        for: 'edge',
        'attr.name': 'pivot',
        'attr.type': 'string',
      },
      {
        id: 'dNote',
        for: 'node',
        'attr.name': 'note',
        'attr.type': 'string',
      },
      {
        id: 'dData',
        for: 'node',
        'attr.name': 'data',
        'attr.type': 'string',
      },
      {
        id: 'dData',
        for: 'edge',
        'attr.name': 'data',
        'attr.type': 'string',
      },
      {
        id: 'dColor',
        for: 'edge',
        'attr.name': 'color',
        'attr.type': 'string',
      },
    ],
  };
  expect(parseCGML(arduinoDemo)).toEqual(predicted);
});

test('test parsing Arduino multidocument', () => {
  const multidocDemo: string = readFileSync('demos/two-blinkers.graphml', 'utf-8');
  const predicted: CGMLElements = {
    stateMachines: {
      G: {
        standardVersion: '1.0',
        platform: 'ArduinoUno',
        meta: {
          values: {
            name: 'Arduino Blinker',
            author: 'Lapki IDE TEAM',
            description: 'Включение и выключение лампочки по таймеру',
          },
          id: 'coreMeta',
        },
        states: {
          diod1: {
            name: 'Включен',
            bounds: {
              x: 82,
              y: 57,
              width: 450,
              height: 95,
            },
            actions: [
              {
                trigger: {
                  event: 'entry',
                  condition: undefined,
                  postfix: 'propagate',
                },
                action: 'LED1.on()\ntimer1.start(1000)',
              },
            ],
            unsupportedDataNodes: [],
          },
          diod2: {
            name: 'Выключен',
            bounds: {
              x: 81,
              y: 334,
              width: 450,
              height: 95,
            },
            actions: [
              {
                trigger: {
                  event: 'entry',
                  condition: undefined,
                  postfix: undefined,
                },
                action: 'LED1.off()\ntimer1.start(1000)',
              },
            ],
            unsupportedDataNodes: [],
          },
        },
        transitions: {
          'init-edge': {
            id: 'init-edge',
            source: 'init',
            target: 'diod1',
            actions: [],
            pivot: undefined,
            labelPosition: undefined,
            unsupportedDataNodes: [],
          },
          edge3: {
            id: 'edge3',
            source: 'diod1',
            target: 'diod2',
            actions: [
              {
                trigger: {
                  event: 'timer1.timeout',
                  condition: undefined,
                  postfix: undefined,
                },
                action: undefined,
              },
            ],
            pivot: undefined,
            unsupportedDataNodes: [],
            labelPosition: {
              x: 457,
              y: 173,
            },
            color: '#F29727',
          },
          edge4: {
            id: 'edge4',
            source: 'diod2',
            target: 'diod1',
            actions: [
              {
                trigger: {
                  event: undefined,
                  condition: 'condition',
                },
                action: 'blabla',
              },
            ],
            pivot: undefined,
            unsupportedDataNodes: [],
            labelPosition: {
              x: 16,
              y: 175,
            },
            color: '#F24C3D',
          },
        },
        initialStates: {
          init: {
            data: '',
            type: 'initial',
          },
        },
        components: {
          cLED1: {
            id: 'LED1',
            type: 'LED',
            order: 0,
            parameters: {
              name: 'Светодиод',
              description: 'Встроенный в плату светодиод, чтобы им мигать',
              pin: '12',
            },
            unsupportedDataNodes: [],
          },
          ctimer1: {
            id: 'timer1',
            type: 'Timer',
            order: 1,
            parameters: {
              name: 'Таймер',
              description: 'Программный таймер.',
            },
            unsupportedDataNodes: [],
          },
        },
        notes: {
          commentX: {
            name: undefined,
            type: 'informal',
            position: {
              x: 640,
              y: 114,
            },
            unsupportedDataNodes: [],
            text: 'Включение и выключение лампочки по таймеру!',
          },
        },
        choices: {},
        terminates: {},
        finals: {},
        unknownVertexes: {},
      },
      O: {
        standardVersion: '1.0',
        platform: 'ArduinoUno',
        meta: {
          values: {
            name: 'Arduino Blinker',
            author: 'Lapki IDE TEAM',
            description: 'Включение и выключение лампочки по таймеру',
          },
          id: 'coreMeta',
        },
        position: {
          x: 10,
          y: 10,
        },
        dimensions: {
          width: 10,
          height: 10,
        },
        states: {
          diod1: {
            name: 'Включен',
            bounds: {
              x: 82,
              y: 57,
              width: 450,
              height: 95,
            },
            actions: [
              {
                trigger: {
                  event: 'entry',
                  condition: undefined,
                  postfix: 'propagate',
                },
                action: 'LED1.on()\ntimer1.start(1000)',
              },
            ],
            unsupportedDataNodes: [],
          },
          diod2: {
            name: 'Выключен',
            bounds: {
              x: 81,
              y: 334,
              width: 450,
              height: 95,
            },
            actions: [
              {
                trigger: {
                  event: 'entry',
                  condition: undefined,
                  postfix: undefined,
                },
                action: 'LED1.off()\ntimer1.start(1000)',
              },
            ],
            unsupportedDataNodes: [],
          },
        },
        transitions: {
          'init-edge': {
            id: 'init-edge',
            source: 'init',
            target: 'diod1',
            actions: [],
            pivot: undefined,
            labelPosition: undefined,
            unsupportedDataNodes: [],
          },
          edge3: {
            id: 'edge3',
            source: 'diod1',
            target: 'diod2',
            actions: [
              {
                trigger: {
                  event: 'timer1.timeout',
                  condition: undefined,
                  postfix: undefined,
                },
                action: undefined,
              },
            ],
            pivot: undefined,
            unsupportedDataNodes: [],
            labelPosition: {
              x: 457,
              y: 173,
            },
            color: '#F29727',
          },
          edge4: {
            id: 'edge4',
            source: 'diod2',
            target: 'diod1',
            actions: [
              {
                trigger: {
                  event: undefined,
                  condition: 'condition',
                },
                action: 'blabla',
              },
            ],
            pivot: undefined,
            unsupportedDataNodes: [],
            labelPosition: {
              x: 16,
              y: 175,
            },
            color: '#F24C3D',
          },
        },
        initialStates: {
          init: {
            data: '',
            type: 'initial',
          },
        },
        components: {
          cLED1: {
            id: 'LED1',
            type: 'LED',
            order: 0,
            parameters: {
              name: 'Светодиод',
              description: 'Встроенный в плату светодиод, чтобы им мигать',
              pin: '12',
            },
            unsupportedDataNodes: [],
          },
          ctimer1: {
            id: 'timer1',
            type: 'Timer',
            order: 1,
            parameters: {
              name: 'Таймер',
              description: 'Программный таймер.',
            },
            unsupportedDataNodes: [],
          },
        },
        notes: {
          commentX: {
            name: undefined,
            type: 'informal',
            position: {
              x: 640,
              y: 114,
            },
            text: 'Включение и выключение лампочки по таймеру!',
            unsupportedDataNodes: [],
          },
        },
        choices: {},
        terminates: {},
        finals: {},
        unknownVertexes: {},
      },
    },
    format: 'Cyberiada-GraphML-1.0',
    keys: [
      {
        id: 'gFormat',
        for: 'graphml',
        'attr.name': 'format',
        'attr.type': 'string',
      },
      {
        id: 'dName',
        for: 'node',
        'attr.name': 'name',
        'attr.type': 'string',
      },
      {
        id: 'dVertex',
        for: 'node',
        'attr.name': 'vertex',
        'attr.type': 'string',
      },
      {
        id: 'dStateMachine',
        for: 'graph',
        'attr.name': 'stateMachine',
        'attr.type': 'string',
      },
      {
        id: 'dGeometry',
        for: 'node',
        'attr.name': 'geometry',
        'attr.type': undefined,
      },
      {
        id: 'dLabelGeometry',
        for: 'edge',
        'attr.name': 'labelGeometry',
        'attr.type': undefined,
      },
      {
        id: 'dPivot',
        for: 'edge',
        'attr.name': 'pivot',
        'attr.type': 'string',
      },
      {
        id: 'dNote',
        for: 'node',
        'attr.name': 'note',
        'attr.type': 'string',
      },
      {
        id: 'dData',
        for: 'node',
        'attr.name': 'data',
        'attr.type': 'string',
      },
      {
        id: 'dData',
        for: 'edge',
        'attr.name': 'data',
        'attr.type': 'string',
      },
      {
        id: 'dColor',
        for: 'edge',
        'attr.name': 'color',
        'attr.type': 'string',
      },
    ],
  };
  expect(parseCGML(multidocDemo)).toEqual(predicted);
});

describe('cyberiada schemes', () => {
  it.each([
    ['demos/20-cyb-geometry.test-input.graphml'],
    ['demos/21-cyb-geometry2.test-input.graphml'],
    ['demos/23-cyb-autoborder.test-input.graphml'],
  ])(`parsing demo %i`, (path) => {
    const scheme = readFileSync(path, 'utf-8');
    parseCGML(scheme);
  });
});

test('test parsing bearloga', () => {
  const bearlogaDemo = readFileSync('demos/autoborder.graphml', 'utf-8');
  const predicted: CGMLElements = {
    stateMachines: {
      G: {
        platform: 'BearsTowerDefence',
        meta: {
          values: {
            name: 'Автобортник',
            author: 'Матросов В.М.',
            contact: 'matrosov@mail.ru',
            description:
              'Пример описания схемы, \nкоторый может быть многострочным, потому что так удобнее',
            target: 'Autoborder',
          },
          id: 'nMeta',
        },
        standardVersion: '1.0',
        states: {
          'n0::n1': {
            name: 'Сближение',
            bounds: {
              x: -525.738953,
              y: 609.6686,
              width: 468,
              height: 170,
            },
            actions: [
              {
                trigger: {
                  event: 'entry',
                  condition: undefined,
                  postfix: undefined,
                },
                action: 'МодульДвижения.ДвигатьсяКЦели()',
              },
              {
                trigger: {
                  event: 'exit',
                  condition: undefined,
                  postfix: undefined,
                },
                action: undefined,
              },
            ],
            unsupportedDataNodes: [],
            parent: 'n0',
          },
          'n0::n2': {
            name: 'Атака',
            bounds: {
              x: -630.2711,
              y: 206.705933,
              width: 468,
              height: 170,
            },
            actions: [
              {
                trigger: {
                  event: 'entry',
                  condition: undefined,
                  postfix: undefined,
                },
                action: 'ОружиеЦелевое.АтаковатьЦель()',
              },
              {
                trigger: {
                  event: 'exit',
                  condition: undefined,
                  postfix: undefined,
                },
              },
            ],
            unsupportedDataNodes: [],
            parent: 'n0',
          },
          n0: {
            name: 'Бой',
            bounds: {
              x: -578.005,
              y: 438.187256,
              width: 672.532166,
              height: 802.962646,
            },
            actions: [
              {
                trigger: {
                  event: 'entry',
                  condition: undefined,
                  postfix: undefined,
                },
              },
              {
                trigger: {
                  event: 'exit',
                  condition: undefined,
                  postfix: undefined,
                },
              },
            ],
            unsupportedDataNodes: [],
          },
          n3: {
            name: 'Скан',
            bounds: {
              x: -1582.03857,
              y: 606.497559,
              width: 468,
              height: 330,
            },
            actions: [
              {
                trigger: {
                  event: 'entry',
                  condition: undefined,
                  postfix: undefined,
                },
                action: 'Сенсор.ПоискВрагаПоДистанции(мин)',
              },
              {
                trigger: {
                  event: 'exit',
                  condition: undefined,
                  postfix: undefined,
                },
                action: 'Сенсор.ОстановкаПоиска()',
              },
            ],
            unsupportedDataNodes: [],
          },
        },
        transitions: {
          'init-n3': {
            id: 'init-n3',
            source: 'init',
            target: 'n3',
            actions: [],
            labelPosition: undefined,
            pivot: undefined,
            unsupportedDataNodes: [],
          },
          'n0-n3': {
            id: 'n0-n3',
            source: 'n0',
            target: 'n3',
            actions: [
              {
                trigger: {
                  event: 'АнализаторЦели.ЦельПотеряна',
                  condition: undefined,
                  postfix: undefined,
                },
              },
            ],
            labelPosition: undefined,
            pivot: undefined,
            unsupportedDataNodes: [],
          },
          'n3-n0::n1': {
            id: 'n3-n0::n1',
            source: 'n3',
            target: 'n0::n1',
            actions: [
              {
                trigger: {
                  event: 'Сенсор.ЦельПолучена',
                  condition: undefined,
                  postfix: undefined,
                },
              },
            ],
            labelPosition: undefined,
            pivot: undefined,
            unsupportedDataNodes: [],
          },
          'n0::n1-n0::n2': {
            id: 'n0::n1-n0::n2',
            source: 'n0::n1',
            target: 'n0::n2',
            actions: [
              {
                trigger: {
                  event: 'ОружиеЦелевое.ЦельВошлаВЗонуАтаки',
                  condition: undefined,
                  postfix: undefined,
                },
              },
            ],
            pivot: undefined,
            labelPosition: undefined,
            unsupportedDataNodes: [],
          },
          'n0::n2-n0::n1': {
            id: 'n0::n2-n0::n1',
            source: 'n0::n2',
            target: 'n0::n1',
            actions: [
              {
                trigger: {
                  event: 'ОружиеЦелевое.ЦельВышлаИзЗоныАтаки',
                  condition: undefined,
                  postfix: undefined,
                },
              },
            ],
            labelPosition: undefined,
            pivot: undefined,
            unsupportedDataNodes: [],
          },
        },
        initialStates: {
          init: {
            type: 'initial',
            position: {
              x: -1482.03857,
              y: 606.497559,
              width: 20,
              height: 20,
            },
            data: '',
          },
        },
        components: {},
        notes: {},
        choices: {},
        terminates: {},
        finals: {},
        unknownVertexes: {},
      },
    },
    format: 'Cyberiada-GraphML-1.0',
    keys: [
      {
        id: 'gFormat',
        for: 'graphml',
        'attr.name': 'format',
        'attr.type': 'string',
      },
      {
        id: 'dName',
        for: 'graph',
        'attr.name': 'name',
        'attr.type': 'string',
      },
      {
        id: 'dName',
        for: 'node',
        'attr.name': 'name',
        'attr.type': 'string',
      },
      {
        id: 'dStateMachine',
        for: 'graph',
        'attr.name': 'stateMachine',
        'attr.type': 'string',
      },
      {
        id: 'dSubmachineState',
        for: 'node',
        'attr.name': 'submachineState',
        'attr.type': 'string',
      },
      {
        id: 'dGeometry',
        for: 'graph',
        'attr.name': 'geometry',
      },
      {
        id: 'dGeometry',
        for: 'node',
        'attr.name': 'geometry',
      },
      {
        id: 'dGeometry',
        for: 'edge',
        'attr.name': 'geometry',
      },
      {
        id: 'dSourcePoint',
        for: 'edge',
        'attr.name': 'sourcePoint',
      },
      {
        id: 'dTargetPoint',
        for: 'edge',
        'attr.name': 'targetPoint',
      },
      {
        id: 'dLabelGeometry',
        for: 'edge',
        'attr.name': 'labelGeometry',
      },
      {
        id: 'dNote',
        for: 'node',
        'attr.name': 'note',
        'attr.type': 'string',
      },
      {
        id: 'dVertex',
        for: 'node',
        'attr.name': 'vertex',
        'attr.type': 'string',
      },
      {
        id: 'dData',
        for: 'node',
        'attr.name': 'data',
        'attr.type': 'string',
      },
      {
        id: 'dData',
        for: 'edge',
        'attr.name': 'data',
        'attr.type': 'string',
      },
      {
        id: 'dMarkup',
        for: 'node',
        'attr.name': 'markup',
        'attr.type': 'string',
      },
      {
        id: 'dColor',
        for: 'node',
        'attr.name': 'color',
        'attr.type': 'string',
      },
      {
        id: 'dColor',
        for: 'edge',
        'attr.name': 'color',
        'attr.type': 'string',
      },
      {
        id: 'dPivot',
        for: 'edge',
        'attr.name': 'pivot',
        'attr.type': 'string',
      },
      {
        id: 'dChunk',
        for: 'edge',
        'attr.name': 'chunk',
        'attr.type': 'string',
      },
    ],
  };
  const parsed = parseCGML(bearlogaDemo);
  expect(parsed).toEqual(predicted);
});

test('test parsing scheme with empty state.', () => {
  const arduinoDemo: string = readFileSync('demos/with-empty-state.graphml', 'utf-8');
  parseCGML(arduinoDemo);
});

test('test parsing arduino with textMode', () => {
  const arduinoDemo: string = readFileSync('demos/arduino-blinker.graphml', 'utf-8');
  const predicted: CGMLTextElements = {
    stateMachines: {
      G: {
        name: 'Моя любимая машина состояний!',
        states: {
          diod1: {
            name: 'Включен',
            bounds: {
              x: 82,
              y: 57,
              width: 450,
              height: 95,
            },
            actions: `entry propagate/
LED1.on()
timer1.start(1000)`,
            unsupportedDataNodes: [],
          },
          diod2: {
            name: 'Выключен',
            bounds: {
              x: 81,
              y: 334,
              width: 450,
              height: 95,
            },
            actions: `entry/
LED1.off()
timer1.start(1000)`,
            unsupportedDataNodes: [],
          },
        },
        transitions: {
          'init-edge': {
            id: 'init-edge',
            color: '#F29727',
            source: 'init',
            target: 'diod1',
            actions: '',
            pivot: undefined,
            labelPosition: undefined,
            unsupportedDataNodes: [],
          },
          edge3: {
            id: 'edge3',
            source: 'diod1',
            target: 'diod2',
            actions: 'timer1.timeout/',
            pivot: undefined,
            unsupportedDataNodes: [],
            labelPosition: {
              x: 457,
              y: 173,
            },
            color: '#F29727',
          },
          edge4: {
            id: 'edge4',
            source: 'diod2',
            target: 'diod1',
            actions: '[condition]/ blabla',
            pivot: undefined,
            unsupportedDataNodes: [],
            labelPosition: {
              x: 16,
              y: 175,
            },
            color: '#F24C3D',
          },
        },
        initialStates: {
          init: {
            data: '',
            type: 'initial',
          },
        },
        components: {
          cLED1: {
            id: 'LED1',
            type: 'LED',
            order: 0,
            parameters: {
              name: 'Светодиод',
              description: 'Встроенный в плату светодиод, чтобы им мигать',
              pin: '12',
            },
            unsupportedDataNodes: [],
          },
          ctimer1: {
            id: 'timer1',
            type: 'Timer',
            order: 1,
            parameters: {
              name: 'Таймер',
              description: 'Программный таймер.',
            },
            unsupportedDataNodes: [
              {
                content: `x/ 12
y/ 13`,
                key: 'dLapkiSchemePosition',
                rect: undefined,
                point: undefined,
              },
            ],
          },
        },
        notes: {
          commentX: {
            name: undefined,
            type: 'informal',
            position: {
              x: 640,
              y: 114,
            },
            unsupportedDataNodes: [
              {
                content: `x/ 12
y/ 13`,
                key: 'dLapkiSchemePosition',
                rect: undefined,
                point: undefined,
              },
            ],
            text: 'Включение и выключение лампочки по таймеру!',
          },
        },
        choices: {},
        terminates: {},
        finals: {},
        unknownVertexes: {},
        standardVersion: '1.0',
        platform: 'ArduinoUno',
        meta: {
          values: {
            name: 'Arduino Blinker',
            author: 'Lapki IDE TEAM',
            description: 'Включение и выключение лампочки по таймеру',
          },
          id: 'coreMeta',
        },
      },
    },
    format: 'Cyberiada-GraphML-1.0',
    keys: [
      {
        id: 'gFormat',
        for: 'graphml',
        'attr.name': 'format',
        'attr.type': 'string',
      },
      {
        id: 'dName',
        for: 'node',
        'attr.name': 'name',
        'attr.type': 'string',
      },
      {
        id: 'dVertex',
        for: 'node',
        'attr.name': 'vertex',
        'attr.type': 'string',
      },
      {
        id: 'dStateMachine',
        for: 'graph',
        'attr.name': 'stateMachine',
        'attr.type': 'string',
      },
      {
        id: 'dGeometry',
        for: 'node',
        'attr.name': 'geometry',
        'attr.type': undefined,
      },
      {
        id: 'dLabelGeometry',
        for: 'edge',
        'attr.name': 'labelGeometry',
        'attr.type': undefined,
      },
      {
        id: 'dPivot',
        for: 'edge',
        'attr.name': 'pivot',
        'attr.type': 'string',
      },
      {
        id: 'dNote',
        for: 'node',
        'attr.name': 'note',
        'attr.type': 'string',
      },
      {
        id: 'dData',
        for: 'node',
        'attr.name': 'data',
        'attr.type': 'string',
      },
      {
        id: 'dData',
        for: 'edge',
        'attr.name': 'data',
        'attr.type': 'string',
      },
      {
        id: 'dColor',
        for: 'edge',
        'attr.name': 'color',
        'attr.type': 'string',
      },
    ],
  };
  expect(parseTextCGML(arduinoDemo)).toEqual(predicted);
});

test('test parse-export-parse cycle, state nested >2', () => {
  const fileContent: string = readFileSync('demos/nested.graphml', 'utf-8');
  const parsed: CGMLElements = parseCGML(fileContent);
  const predicted: CGMLElements = {
    stateMachines: {
      g: {
        states: {
          diod1: {
            name: 'Включен',
            bounds: {
              x: 82,
              y: 57,
              width: 450,
              height: 95,
            },
            actions: [
              {
                trigger: {
                  event: 'entry',
                },
                action: 'LED1.on();\ntimer1.start(1000);',
              },
            ],
            unsupportedDataNodes: [],
            color: '#FFFFFF',
          },
          qoyigesoisdelydcpebg: {
            name: 'Состояние2',
            bounds: {
              x: 100,
              y: 100,
              width: 450,
              height: 85,
            },
            actions: [],
            unsupportedDataNodes: [],
            parent: 'vgkwfgpvpiijecqqsklc',
          },
          vgkwfgpvpiijecqqsklc: {
            name: 'Состояние',
            bounds: {
              x: 100,
              y: 100,
              width: 450,
              height: 85,
            },
            actions: [],
            unsupportedDataNodes: [],
            parent: 'diod2',
          },
          diod2: {
            name: 'Выключен',
            bounds: {
              x: 197,
              y: 373,
              width: 450,
              height: 95,
            },
            actions: [
              {
                trigger: {
                  event: 'entry',
                },
                action: 'LED1.off();\ntimer1.start(1000);',
              },
            ],
            unsupportedDataNodes: [],
            color: '#FFFFFF',
          },
        },
        transitions: {
          'init-edge': {
            labelPosition: undefined,
            pivot: undefined,
            id: 'init-edge',
            source: 'init',
            target: 'diod1',
            actions: [],
            unsupportedDataNodes: [],
          },
          edge3: {
            pivot: undefined,
            id: 'edge3',
            source: 'diod1',
            target: 'diod2',
            actions: [
              {
                trigger: {
                  event: 'timer1.timeout',
                },
              },
            ],
            unsupportedDataNodes: [],
            labelPosition: {
              x: 389,
              y: 193,
            },
            color: '#F29727',
          },
          edge4: {
            pivot: undefined,
            id: 'edge4',
            source: 'diod2',
            target: 'diod1',
            actions: [
              {
                trigger: {
                  event: 'timer1.timeout',
                },
              },
            ],
            unsupportedDataNodes: [],
            labelPosition: {
              x: 81.5,
              y: 193.46,
            },
            color: '#F24C3D',
          },
          gcilpjvuetozyivwbibg: {
            labelPosition: undefined,
            pivot: undefined,
            id: 'gcilpjvuetozyivwbibg',
            source: 'uvzlbsocvdjwydtuzmbl',
            target: 'vgkwfgpvpiijecqqsklc',
            actions: [],
            unsupportedDataNodes: [],
          },
          dnvyfmwktbpdumazbihd: {
            labelPosition: undefined,
            pivot: undefined,
            id: 'dnvyfmwktbpdumazbihd',
            source: 'fzqikhowikmzqsdewfki',
            target: 'qoyigesoisdelydcpebg',
            actions: [],
            unsupportedDataNodes: [],
          },
        },
        components: {
          cLED1: {
            id: 'LED1',
            type: 'LED',
            parameters: {
              name: 'Светодиод',
              description: 'Встроенный в плату светодиод, чтобы им мигать',
              pin: '12',
            },
            order: 0,
            unsupportedDataNodes: [],
          },
          ctimer1: {
            id: 'timer1',
            type: 'Timer',
            parameters: {
              name: 'Таймер',
              description: 'Программный таймер.',
            },
            order: 1,
            unsupportedDataNodes: [],
          },
        },
        initialStates: {
          fzqikhowikmzqsdewfki: {
            type: 'initial',
            data: '',
            position: {
              x: 0,
              y: 0,
              width: -1,
              height: -1,
            },
            parent: 'vgkwfgpvpiijecqqsklc',
          },
          uvzlbsocvdjwydtuzmbl: {
            type: 'initial',
            data: '',
            position: {
              x: 0,
              y: 0,
              width: -1,
              height: -1,
            },
            parent: 'diod2',
          },
          init: {
            type: 'initial',
            data: '',
            position: {
              x: 20,
              y: 30,
              width: -1,
              height: -1,
            },
          },
        },
        notes: {
          commentX: {
            name: undefined,
            type: 'informal',
            position: {
              x: 640,
              y: 114,
            },
            text: 'Включение и выключение лампочки по таймеру!',
            unsupportedDataNodes: [],
          },
        },
        terminates: {},
        choices: {},
        finals: {},
        unknownVertexes: {},
        platform: 'ArduinoUno',
        meta: {
          values: {
            name: 'Arduino Blinker',
            author: 'Lapki IDE TEAM',
            description: 'Включение и выключение лампочки по таймеру',
            platformVersion: '1.0',
          },
          id: 'coreMeta',
        },
        standardVersion: '1.0',
      },
    },
    format: 'Cyberiada-GraphML-1.0',
    keys: [
      {
        id: 'dName',
        for: 'node',
        'attr.name': 'name',
        'attr.type': 'string',
      },
      {
        id: 'dData',
        for: 'node',
        'attr.name': 'data',
        'attr.type': 'string',
      },
      {
        id: 'dData',
        for: 'edge',
        'attr.name': 'data',
        'attr.type': 'string',
      },
      {
        id: 'dInitial',
        for: 'node',
        'attr.name': 'initial',
        'attr.type': 'string',
      },
      {
        id: 'dGeometry',
        for: 'edge',
      },
      {
        id: 'dGeometry',
        for: 'node',
      },
      {
        id: 'dColor',
        for: 'edge',
      },
      {
        id: 'dNote',
        for: 'node',
      },
      {
        id: 'dColor',
        for: 'node',
      },
    ],
  };
  expect(parsed).toEqual(predicted);
});
