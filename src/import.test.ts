import { parseCGML } from './import';
import { readFileSync } from 'fs';

test('test parsing arduino', () => {
  const arduinoDemo: string = readFileSync('demos/arduino-blinker.graphml', 'utf-8');
  expect(parseCGML(arduinoDemo)).toEqual({
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
            trigger: 'entry',
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
            trigger: 'entry',
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
        unsupportedDataNodes: [],
      },
      edge3: {
        id: 'edge3',
        source: 'diod1',
        target: 'diod2',
        actions: [
          {
            trigger: 'timer1.timeout',
          },
        ],
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
            trigger: 'timer1.timeout',
          },
        ],
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
        type: 'initial',
        data: '',
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
      },
      ctimer1: {
        id: 'timer1',
        type: 'Timer',
        parameters: {
          name: 'Таймер',
          description: 'Программный таймер.',
        },
      },
    },
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
      },
      {
        id: 'dLabelGeometry',
        for: 'edge',
        'attr.name': 'labelGeometry',
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
    notes: {
      commentX: {
        type: 'informal',
        position: {
          x: 640,
          y: 114,
        },
        text: 'Включение и выключение лампочки по таймеру!',
      },
    },
    choices: {},
    terminates: {},
    finals: {},
  });
});

test('test parsing bearloga', () => {
  const bearlogaDemo = readFileSync('demos/autoborder.graphml', 'utf-8');
  const parsed = parseCGML(bearlogaDemo);
  expect(parsed).toEqual({
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
            trigger: 'entry',
            action: 'МодульДвижения.ДвигатьсяКЦели()',
          },
          {
            trigger: 'exit',
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
            trigger: 'entry',
            action: 'ОружиеЦелевое.АтаковатьЦель()',
          },
          {
            trigger: 'exit',
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
            trigger: 'entry',
          },
          {
            trigger: 'exit',
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
            trigger: 'entry',
            action: 'Сенсор.ПоискВрагаПоДистанции(мин)',
          },
          {
            trigger: 'exit',
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
        unsupportedDataNodes: [],
      },
      'n0-n3': {
        id: 'n0-n3',
        source: 'n0',
        target: 'n3',
        actions: [
          {
            trigger: 'АнализаторЦели.ЦельПотеряна',
          },
        ],
        unsupportedDataNodes: [],
      },
      'n3-n0::n1': {
        id: 'n3-n0::n1',
        source: 'n3',
        target: 'n0::n1',
        actions: [
          {
            trigger: 'Сенсор.ЦельПолучена',
          },
        ],
        unsupportedDataNodes: [],
      },
      'n0::n1-n0::n2': {
        id: 'n0::n1-n0::n2',
        source: 'n0::n1',
        target: 'n0::n2',
        actions: [
          {
            trigger: 'ОружиеЦелевое.ЦельВошлаВЗонуАтаки',
          },
        ],
        unsupportedDataNodes: [],
      },
      'n0::n2-n0::n1': {
        id: 'n0::n2-n0::n1',
        source: 'n0::n2',
        target: 'n0::n1',
        actions: [
          {
            trigger: 'ОружиеЦелевое.ЦельВышлаИзЗоныАтаки',
          },
        ],
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
    notes: {},
    choices: {},
    terminates: {},
    finals: {},
  });
});

test('test parsing scheme with empty state.', () => {
  const arduinoDemo: string = readFileSync('demos/with-empty-state.graphml', 'utf-8');
  parseCGML(arduinoDemo);
});
