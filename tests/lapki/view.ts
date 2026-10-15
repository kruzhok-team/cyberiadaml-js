/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The fields lapki-client reads (GraphmlParser.ts)
 *
 * Copyright (C) 2026 Alexey Fedoseev <aleksey@fedoseev.net>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/
 *
 * ----------------------------------------------------------------------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Typed loosely on purpose: the same view is taken from the 1.x elements when it is recorded.

function actions(list: any[]): any[] {
  return list.map((a) => ({
    event: a.trigger?.event,
    condition: a.trigger?.condition,
    postfix: a.trigger?.postfix,
    action: a.action,
  }));
}

function sorted(record: { [name: string]: string }): { [name: string]: string } {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

function schemePosition(component: any): any {
  const node = component.unsupportedDataNodes.find((d: any) => d.key === 'dLapkiSchemePosition');
  return node?.point ? { x: +node.point[0].x, y: +node.point[0].y } : null;
}

function vertexes(record: { [id: string]: any }): any {
  return Object.fromEntries(
    Object.entries(record).map(([id, v]) => [
      id,
      { position: v.position ? { x: v.position.x, y: v.position.y } : null, parent: v.parent },
    ]),
  );
}

/** The view of one document: per machine the fields lapki-client reads, in its terms. */
export function view(elements: any): any {
  const result: any = {};
  for (const [id, sm] of Object.entries<any>(elements.stateMachines)) {
    result[id] = {
      name: sm.name,
      platform: sm.platform,
      position: sm.position,
      meta: sorted(sm.meta.values),
      components: Object.values<any>(sm.components).map((c) => ({
        id: c.id,
        name: c.parameters['name'],
        type: c.type,
        parameters: sorted(c.parameters),
        order: c.order,
        position: schemePosition(c),
      })),
      states: Object.fromEntries(
        Object.entries<any>(sm.states).map(([sid, s]) => [
          sid,
          {
            name: s.name,
            color: s.color,
            bounds: s.bounds,
            parent: s.parent,
            actions: actions(s.actions),
          },
        ]),
      ),
      initialStates: vertexes(sm.initialStates),
      finals: vertexes(sm.finals),
      shallowHistory: vertexes(sm.shallowHistory),
      choices: vertexes(sm.choices),
      notes: Object.fromEntries(
        Object.entries<any>(sm.notes).map(([nid, n]) => [
          nid,
          {
            name: n.name,
            text: n.text,
            type: n.type,
            position: n.position ? { x: n.position.x, y: n.position.y } : null,
            format: n.unsupportedDataNodes.find((d: any) => d.key === 'dLapkiNoteFormat')?.content,
          },
        ]),
      ),
      transitions: Object.fromEntries(
        Object.entries<any>(sm.transitions).map(([tid, t]) => [
          tid,
          {
            source: t.source,
            target: t.target,
            color: t.color,
            labelPosition: t.labelPosition,
            actions: actions(t.actions),
          },
        ]),
      ),
    };
  }
  // undefined fields dropped, as JSON keeps them
  return JSON.parse(JSON.stringify(result));
}
