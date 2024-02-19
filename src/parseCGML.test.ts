import { parseCGML } from './index';


test('test parsing Bearloga schema', () => {
    expect(parseCGML(`<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">

<data key="gFormat">Cyberiada-GraphML</data>

<key id="dName" for="node" attr.name="name" attr.type="string"/>
<key id="dData" for="edge" attr.name="data" attr.type="string"/>
<key id="dData" for="node" attr.name="data" attr.type="string"/>
<key id="dInitial" for="node" attr.name="initial" attr.type="string"/>
<key id="dGeometry" for="edge"/>
<key id="dGeometry" for="node"/>

<graph id="G" edgedefault="directed">

  <node id="">
    <data key="dName">BearlogaDefend</data>
    <data key="dData">name/ Автобортник
author/ Матросов В.М.
contact/ matrosov@mail.ru
description/ Пример описания схемы, 
который может быть многострочным, потому что так удобнее
unit/ Autoborder
    </data>
  </node>

  <node id="n0">
    <data key="dName">Бой</data>
    <data key="dData">entry/
exit/
</data>
    <data key="dGeometry" x="-578.005" y="438.187256"
          width="672.532166" height="802.962646" />
    <graph>
      <node id="n0::n1">
        <data key="dName">Сближение</data>
        <data key="dData">entry/
МодульДвижения.ДвигатьсяКЦели()

exit/
</data>
        <data key="dGeometry" x="-525.738953" y="609.6686" 
              width="468" height="170" />    
      </node>
      <node id="n0::n2">
        <data key="dName">Атака</data>
        <data key="dData">entry/
ОружиеЦелевое.АтаковатьЦель()

exit/
</data>
        <data key="dGeometry" x="-630.2711" y="206.705933" 
              width="468" height="170" />
      </node>
    </graph>
  </node>
  <node id="n3">
    <data key="dName">Скан</data>
    <data key="dData">entry/
Сенсор.ПоискВрагаПоДистанции(мин)

exit/
Сенсор.ОстановкаПоиска()
</data>
    <data key="dGeometry" x="-1582.03857" y="606.497559" 
          width="468" height="330" />      
  </node>
  <node id="init">
    <data key="dInitial"></data>
    <data key="dGeometry" x="-1482.03857" y="606.497559" 
          width="20" height="20" />      
  </node>
  
  <edge source="init" target="n3"> </edge>
  <edge source="n0" target="n3">
    <data key="dData">АнализаторЦели.ЦельУничтожена/
</data>
  </edge>
  <edge source="n0" target="n3">
    <data key="dData">АнализаторЦели.ЦельПотеряна/
</data>
  </edge>
  <edge source="n3" target="n0::n1">
    <data key="dData">Сенсор.ЦельПолучена/
</data>
  </edge>
  <edge source="n0::n1" target="n0::n2">
      <data key="dData">ОружиеЦелевое.ЦельВошлаВЗонуАтаки/
</data>
  </edge>
  <edge source="n0::n2" target="n0::n1">
      <data key="dData">ОружиеЦелевое.ЦельВышлаИзЗоныАтаки/
</data>
  </edge>

</graph>

</graphml>
        `
    )).toStrictEqual(
    {
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
          position: {
            x: 0,
            y: 0
          },
          actions: "АнализаторЦели.ЦельУничтожена/",
          unsupportedDataNodes: []
        },
        {
          source: "n0",
          target: "n3",
          position: {
            x: 0,
            y: 0
          },
          actions: "АнализаторЦели.ЦельПотеряна/",
          unsupportedDataNodes: []
        },
        {
          source: "n3",
          target: "n0::n1",
          position: {
            x: 0,
            y: 0
          },
          actions: "Сенсор.ЦельПолучена/",
          unsupportedDataNodes: []
        },
        {
          source: "n0::n1",
          target: "n0::n2",
          position: {
            x: 0,
            y: 0
          },
          actions: "ОружиеЦелевое.ЦельВошлаВЗонуАтаки/",
          unsupportedDataNodes: []
        },
        {
          source: "n0::n2",
          target: "n0::n1",
          position: {
            "x": 0,
            "y": 0
          },
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
    })
}
);
