import { exportGraphml } from "./export";

test(
    "test export to CGML",
    () => {
        expect(exportGraphml(    {
      states: {
        "n0::n1": {
          name: "Сближение",
          bounds: {
            x: -525.738953,
            y: 609.6686,
            width: 468,
            height: 170
          },
          actions: "entry/\nМодульДвижения.ДвигатьсяКЦели()\n\nexit/",
          unsupportedDataNodes: [],
          parent: "n0"
        },
        "n0::n2": {
          name: "Атака",
          bounds: {
            x: -630.2711,
            y: 206.705933,
            width: 468,
            height: 170
          },
          actions: "entry/\nОружиеЦелевое.АтаковатьЦель()\n\nexit/",
          unsupportedDataNodes: [],
          parent: "n0"
        },
        n0: {
          name: "Бой",
          bounds: {
            x: -578.005,
            y: 438.187256,
            width: 672.532166,
            height: 802.962646
          },
          actions: "entry/\nexit/",
          unsupportedDataNodes: []
        },
        n3: {
          name: "Скан",
          bounds: {
            "x": -1582.03857,
            "y": 606.497559,
            "width": 468,
            "height": 330
          },
          actions: "entry/\nСенсор.ПоискВрагаПоДистанции(мин)\n\nexit/\nСенсор.ОстановкаПоиска()",
          unsupportedDataNodes: []
        }
      },
      transitions: [
        {
          source: "n0",
          target: "n3",
          actions: "АнализаторЦели.ЦельУничтожена/",
          unsupportedDataNodes: []
        },
        {
          source: "n0",
          target: "n3",
          actions: "АнализаторЦели.ЦельПотеряна/",
          unsupportedDataNodes: []
        },
        {
          source: "n3",
          target: "n0::n1",
          actions: "Сенсор.ЦельПолучена/",
          unsupportedDataNodes: []
        },
        {
          source: "n0::n1",
          target: "n0::n2",
          actions: "ОружиеЦелевое.ЦельВошлаВЗонуАтаки/",
          unsupportedDataNodes: []
        },
        {
          source: "n0::n2",
          target: "n0::n1",
          actions: "ОружиеЦелевое.ЦельВышлаИзЗоныАтаки/",
          unsupportedDataNodes: []
        }
      ],
      initialState: {
        target: "n3",
        position: {
          x: -1482.03857,
          y: 606.497559
        }
      },
      components: {},
      platform: "BearlogaDefend",
      meta: "name/ Автобортник\nauthor/ Матросов В.М.\ncontact/ matrosov@mail.ru\ndescription/ Пример описания схемы, \nкоторый может быть многострочным, потому что так удобнее\nunit/ Autoborder",
      format: "Cyberiada-GraphML",
      keys: [
        {
          id: "dName",
          for: "node",
          'attr.name': "name",
          'attr.type': "string",
        },
        {
          id: "dData",
          for: "edge",
          "attr.name": "data",
          "attr.type": "string",
        },
        {
          id: "dData",
          for: "node",
          "attr.name": "data",
          "attr.type": "string",
        },
        {
          id: "dInitial",
          for: "node",
          "attr.name": "initial",
          "attr.type": "string",
        },
        {
          id: "dGeometry",
          for: "edge",
          "attr.name": undefined,
          "attr.type": undefined,
        },
        {
          id: "dGeometry",
          for: "node",
          "attr.name": undefined,
          "attr.type": undefined,
        }
      ]
    }))
    }
)