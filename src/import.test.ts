import { parseCGML } from './import';
import { readFileSync } from 'fs';

test('test parsing Bearloga schema', () => {
  const bearlogaDemo: string = readFileSync('demos/CyberiadaFormat-Autoborder.graphml', 'utf-8');
  expect(parseCGML(bearlogaDemo)).toStrictEqual({
    notes: {
      note: {
        text: 'This is note!',
        position: {
          x: 12,
          y: 12,
        },
      },
    },
    states: {
      emptyState: {
        name: 'Состояние',
        bounds: {
          x: -1608.5385700000004,
          y: 318.0811,
          width: 450,
          height: 85,
        },
        actions: undefined,
        unsupportedDataNodes: [],
      },
      'n0::n1': {
        name: 'Сближение',
        bounds: {
          x: -525.738953,
          y: 609.6686,
          width: 468,
          height: 170,
        },
        actions: 'entry/\nМодульДвижения.ДвигатьсяКЦели()\n\nexit/',
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
        actions: 'entry/\nОружиеЦелевое.АтаковатьЦель()\n\nexit/',
        unsupportedDataNodes: [],
        parent: 'n0',
      },
      n0: {
        color: '#FFFFFF',
        name: 'Бой',
        bounds: {
          x: -578.005,
          y: 438.187256,
          width: 672.532166,
          height: 802.962646,
        },
        actions: 'entry/\nexit/',
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
        actions: 'entry/\nСенсор.ПоискВрагаПоДистанции(мин)\n\nexit/\nСенсор.ОстановкаПоиска()',
        unsupportedDataNodes: [],
      },
    },
    transitions: {
      edge1: {
        id: 'edge1',
        source: 'init',
        target: 'n3',
        unsupportedDataNodes: [],
      },
      edge2: {
        id: 'edge2',
        source: 'n0',
        target: 'n3',
        actions: 'АнализаторЦели.ЦельУничтожена/',
        unsupportedDataNodes: [],
      },
      edge3: {
        id: 'edge3',
        source: 'n0',
        target: 'n3',
        actions: 'АнализаторЦели.ЦельПотеряна/',
        unsupportedDataNodes: [],
      },
      edge4: {
        id: 'edge4',
        source: 'n3',
        target: 'n0::n1',
        actions: 'Сенсор.ЦельПолучена/',
        unsupportedDataNodes: [],
      },
      edge5: {
        id: 'edge5',
        source: 'n0::n1',
        target: 'n0::n2',
        actions: 'ОружиеЦелевое.ЦельВошлаВЗонуАтаки/',
        unsupportedDataNodes: [],
      },
      edge6: {
        id: 'edge6',
        source: 'n0::n2',
        target: 'n0::n1',
        actions: 'ОружиеЦелевое.ЦельВышлаИзЗоныАтаки/',
        unsupportedDataNodes: [],
      },
    },
    initialState: {
      transitionId: 'edge1',
      id: 'init',
      target: 'n3',
      position: {
        x: -1482.03857,
        y: 606.497559,
      },
    },
    components: {},
    platform: 'BearlogaDefend',
    meta: 'name/ Автобортник\nauthor/ Матросов В.М.\ncontact/ matrosov@mail.ru\ndescription/ Пример описания схемы, \nкоторый может быть многострочным, потому что так удобнее\nunit/ Autoborder',
    format: 'Cyberiada-GraphML',
    keys: [
      {
        id: 'dName',
        for: 'node',
        'attr.name': 'name',
        'attr.type': 'string',
      },
      {
        id: 'dData',
        for: 'edge',
        'attr.name': 'data',
        'attr.type': 'string',
      },
      {
        id: 'dData',
        for: 'node',
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
        'attr.name': undefined,
        'attr.type': undefined,
      },
      {
        id: 'dGeometry',
        for: 'node',
        'attr.name': undefined,
        'attr.type': undefined,
      },
      {
        id: 'dNote',
        for: 'node',
        'attr.name': undefined,
        'attr.type': undefined,
      },
      {
        id: 'dColor',
        for: 'node',
        'attr.name': undefined,
        'attr.type': undefined,
      },
    ],
  });
});

test('test parsing ArduinoUno schema', () => {
  const arduinoDemo: string = readFileSync('demos/CyberiadaFormat-Blinker.graphml', 'utf-8');
  expect(parseCGML(arduinoDemo)).toStrictEqual({
    notes: {},
    components: {
      LED1: {
        id: 'LED1',
        parameters: `type/ LED
name/ Светодиод
description/ Встроенный в плату светодиод, чтобы им мигать
pin/ 12`,
        transitionId: 'edge-1',
      },
      timer1: {
        id: 'timer1',
        parameters: `type/ Timer
name/ Светодиод
description/ Программный таймер.`,
        transitionId: 'edge0',
      },
    },
    format: 'Cyberiada-GraphML',
    initialState: {
      transitionId: 'edge1',
      id: 'init',
      target: 'diod1',
      position: {
        x: 311,
        y: -94,
      },
    },
    keys: [
      {
        'attr.name': 'name',
        'attr.type': 'string',
        for: 'node',
        id: 'dName',
      },
      {
        'attr.name': 'data',
        'attr.type': 'string',
        for: 'edge',
        id: 'dData',
      },
      {
        'attr.name': 'data',
        'attr.type': 'string',
        for: 'node',
        id: 'dData',
      },
      {
        'attr.name': 'initial',
        'attr.type': 'string',
        for: 'node',
        id: 'dInitial',
      },
      {
        'attr.name': undefined,
        'attr.type': undefined,
        for: 'edge',
        id: 'dGeometry',
      },
      {
        'attr.name': undefined,
        'attr.type': undefined,
        for: 'node',
        id: 'dGeometry',
      },
      {
        'attr.name': undefined,
        'attr.type': undefined,
        for: 'edge',
        id: 'dColor',
      },
    ],
    meta: `name/ Arduino-Blinker
description/ Включение и выключение лампочки по таймеру`,
    platform: 'ArduinoUno',
    states: {
      diod1: {
        actions: `entry/
LED1.on()
timer1.start(1000)`,
        bounds: {
          height: 95,
          width: 450,
          x: 82,
          y: 57,
        },
        name: 'Включен',
        unsupportedDataNodes: [],
      },
      diod2: {
        actions: `entry/
LED1.off()
timer1.start(1000)`,
        bounds: {
          height: 95,
          width: 450,
          x: 81,
          y: 334,
        },
        name: 'Выключен',
        unsupportedDataNodes: [],
      },
    },
    transitions: {
      edge1: {
        id: 'edge1',
        source: 'init',
        target: 'diod1',
        unsupportedDataNodes: [],
      },
      edge2: {
        id: 'edge2',
        actions: 'timer1.timeout/',
        color: '#F29727',
        position: { x: 457, y: 173 },
        source: 'diod1',
        target: 'diod2',
        unsupportedDataNodes: [],
      },
      edge3: {
        id: 'edge3',
        actions: 'timer1.timeout/',
        color: '#F24C3D',
        position: { x: 16, y: 175 },
        source: 'diod2',
        target: 'diod1',
        unsupportedDataNodes: [],
      },
    },
  });
});
