/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The requirement table transcribed from the testing specification
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

export const MUST = 'MUST';
export const SHOULD = 'SHOULD';
export const MAY = 'MAY';

export const CORE = 'CORE';
export const EXT_COMPLETENESS = 'EXT-COMPLETENESS';
export const EXT_DISPLAY = 'EXT-DISPLAY';
export const EXT_PLATFORM = 'EXT-PLATFORM';

// which part of the suite can check the requirement: a document (validator), the
// implementation behaviour (integration), produced documents alone (write-only)
export const VALIDATOR = 'validator';
export const INTEGRATION = 'integration';
export const WRITE_ONLY = 'write-only';
export const PENDING = 'pending';

export interface Req {
  level: string;
  senses: string;
  profile: string;
  scope: string;
}

function req(level: string, senses: string, profile: string, scope: string): Req {
  return { level, senses, profile, scope };
}

export const REQUIREMENTS: Map<string, Req> = new Map([
  // 5.1 Document
  ['CGML-5.1-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-5.1-2', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-5.1-3', req(MAY, 'R', CORE, VALIDATOR)],
  // 5.2 Special characters
  ['CGML-5.2-1', req(MUST, 'RW', CORE, VALIDATOR)],
  // 5.3 XML text comments
  ['CGML-5.3-1', req(MUST, 'R', CORE, VALIDATOR)],
  // 5.4 Format version
  ['CGML-5.4-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-5.4-2', req(MUST, 'RWX', CORE, VALIDATOR)],
  // 5.5 Data keys
  ['CGML-5.5-1', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-5.5-2', req(SHOULD, 'RW', CORE, VALIDATOR)],
  ['CGML-5.5-3', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-5.5-4', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-5.5-5', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-5.5-6', req(SHOULD, 'RW', CORE, WRITE_ONLY)],
  ['CGML-5.5-7', req(MAY, 'R', CORE, INTEGRATION)],
  // 5.6 Graph
  ['CGML-5.6-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-5.6-2', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-5.6-3', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-5.6-4', req(SHOULD, 'W', CORE, WRITE_ONLY)],
  // 5.7 Node
  ['CGML-5.7-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-5.7-2', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-5.7-3', req(MAY, 'R', CORE, VALIDATOR)],
  ['CGML-5.7-4', req(MUST, 'RWX', CORE, VALIDATOR)],
  // 5.8 Edge
  ['CGML-5.8-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-5.8-2', req(SHOULD, 'W', CORE, VALIDATOR)],
  ['CGML-5.8-3', req(MUST, 'RW', CORE, VALIDATOR)],
  // 5.9 Identifiers
  ['CGML-5.9-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-5.9-2', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-5.9-3', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-5.9-4', req(MUST, 'RWX', CORE, VALIDATOR)],
  // 5.10 Differences from GraphML
  ['CGML-5.10-1', req(MUST, 'RW', CORE, INTEGRATION)],
  // 6.1 State machine
  ['CGML-6.1-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.1-2', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.1-3', req(MAY, 'RW', CORE, INTEGRATION)],
  ['CGML-6.1-4', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.1-5', req(MAY, 'RW', CORE, INTEGRATION)],
  ['CGML-6.1-6', req(MUST, 'RWX', CORE, VALIDATOR)],
  // 6.2 Simple state
  ['CGML-6.2-1', req(MUST, 'R', CORE, INTEGRATION)],
  ['CGML-6.2-2', req(MAY, 'RWX', CORE, INTEGRATION)],
  ['CGML-6.2-3', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.2-4', req(MAY, 'RW', CORE, INTEGRATION)],
  ['CGML-6.2-5', req(MAY, 'RW', CORE, INTEGRATION)],
  // 6.3 Transition
  ['CGML-6.3-1', req(MAY, 'RW', CORE, INTEGRATION)],
  ['CGML-6.3-2', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.3-3', req(MAY, 'R', CORE, INTEGRATION)],
  ['CGML-6.3-4', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.3-5', req(MUST, 'RW', CORE, VALIDATOR)],
  // 6.4 Pseudostates and final state
  ['CGML-6.4-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.4-2', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.4-3', req(MAY, 'RW', CORE, INTEGRATION)],
  ['CGML-6.4-4-1', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-6.4-4-2', req(SHOULD, 'RX', CORE, VALIDATOR)],
  // 6.5 Composite state and region
  ['CGML-6.5-1', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-6.5-2', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-6.5-3', req(SHOULD, 'W', CORE, WRITE_ONLY)],
  ['CGML-6.5-4', req(MAY, 'RW', CORE, INTEGRATION)],
  ['CGML-6.5-5', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.5-6', req(MAY, 'W', CORE, INTEGRATION)],
  ['CGML-6.5-7', req(MUST, 'R', CORE, INTEGRATION)],
  ['CGML-6.5-8', req(MUST, 'RWX', CORE, VALIDATOR)],
  // 6.6 Comment
  ['CGML-6.6-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.6-2', req(MAY, 'RW', CORE, INTEGRATION)],
  ['CGML-6.6-3', req(SHOULD, 'R', CORE, INTEGRATION)],
  ['CGML-6.6-4', req(MAY, 'R', CORE, INTEGRATION)],
  // 6.7 Comment-subject links
  ['CGML-6.7-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.7-2', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.7-3', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.7-4', req(MUST, 'RWX', CORE, VALIDATOR)],
  // 6.8 Events, guards, behaviour
  ['CGML-6.8-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.8-2', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-6.8-3', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-6.8-3-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.8-4', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-6.8-4-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.8-4-2', req(MAY, 'RW', CORE, INTEGRATION)],
  ['CGML-6.8-4-3', req(MUST, 'RW', CORE, INTEGRATION)],
  ['CGML-6.8-4-4', req(MAY, 'R', CORE, INTEGRATION)],
  ['CGML-6.8-5', req(MAY, 'RW', CORE, VALIDATOR)],
  ['CGML-6.8-5-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.8-5-2', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.8-6', req(MAY, 'RW', CORE, VALIDATOR)],
  ['CGML-6.8-7', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.8-8', req(MUST, 'RW', CORE, VALIDATOR)],
  // 6.9 Document metadata
  ['CGML-6.9-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.9-2', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.9-2-1', req(MAY, 'RW', CORE, INTEGRATION)],
  ['CGML-6.9-2-2', req(SHOULD, 'W', CORE, WRITE_ONLY)],
  ['CGML-6.9-3', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-6.9-4-1', req(MAY, 'R', CORE, VALIDATOR)],
  ['CGML-6.9-4-2', req(MAY, 'R', CORE, VALIDATOR)],
  ['CGML-6.9-4-3', req(MAY, 'R', CORE, VALIDATOR)],
  ['CGML-6.9-4-4', req(MAY, 'R', CORE, VALIDATOR)],
  ['CGML-6.9-4-5', req(MAY, 'R', CORE, VALIDATOR)],
  ['CGML-6.9-4-6', req(MAY, 'R', CORE, VALIDATOR)],
  ['CGML-6.9-5', req(MAY, 'R', CORE, VALIDATOR)],
  ['CGML-6.9-6', req(MUST, 'R', CORE, INTEGRATION)],
  // 7.1 Geometry types
  ['CGML-7.1-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  // 7.2 Base geometry format
  ['CGML-7.2-1-1', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-7.2-1-2', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-7.2-1-3', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-7.2-1-4', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-7.2-1-5', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-7.2-1-6', req(MUST, 'RW', CORE, VALIDATOR)],
  ['CGML-7.2-2', req(MUST, 'RWX', CORE, VALIDATOR)],
  ['CGML-7.2-3', req(MAY, 'R', CORE, INTEGRATION)],
  ['CGML-7.2-4', req(MUST, 'R', CORE, INTEGRATION)],
  // 8.1 Submachine state
  ['CGML-8.1-1', req(MUST, 'RWX', EXT_COMPLETENESS, VALIDATOR)],
  ['CGML-8.1-1-1', req(MUST, 'RWX', EXT_COMPLETENESS, VALIDATOR)],
  ['CGML-8.1-2', req(MUST, 'RWX', EXT_COMPLETENESS, VALIDATOR)],
  ['CGML-8.1-3', req(MUST, 'RWX', EXT_COMPLETENESS, VALIDATOR)],
  ['CGML-8.1-4', req(MUST, 'RWX', EXT_COMPLETENESS, VALIDATOR)],
  // 8.2 History pseudostates
  ['CGML-8.2-1', req(MUST, 'RW', EXT_COMPLETENESS, INTEGRATION)],
  ['CGML-8.2-2', req(MUST, 'RW', EXT_COMPLETENESS, INTEGRATION)],
  // 8.3 Entry/exit points
  ['CGML-8.3-1', req(MUST, 'RW', EXT_COMPLETENESS, INTEGRATION)],
  ['CGML-8.3-2', req(MUST, 'RW', EXT_COMPLETENESS, INTEGRATION)],
  ['CGML-8.3-3', req(MUST, 'RW', EXT_COMPLETENESS, INTEGRATION)],
  ['CGML-8.3-4', req(MUST, 'RWX', EXT_COMPLETENESS, VALIDATOR)],
  ['CGML-8.3-5', req(MUST, 'RWX', EXT_COMPLETENESS, VALIDATOR)],
  // 8.4 Collapsed composite state
  ['CGML-8.4-1', req(MAY, 'RW', EXT_COMPLETENESS, INTEGRATION)],
  ['CGML-8.4-2', req(MUST, 'WX', EXT_COMPLETENESS, VALIDATOR)],
  // 8.5 Comment link to a transition
  ['CGML-8.5-1', req(MAY, 'RW', EXT_COMPLETENESS, INTEGRATION)],
  ['CGML-8.5-2', req(MUST, 'RWX', EXT_COMPLETENESS, VALIDATOR)],
  ['CGML-8.5-3', req(MUST, 'X', EXT_COMPLETENESS, VALIDATOR)],
  // 9.1 Full geometry
  ['CGML-9.1-1', req(MUST, 'RWX', EXT_DISPLAY, INTEGRATION)],
  ['CGML-9.1-1-1', req(MUST, 'RW', EXT_DISPLAY, INTEGRATION)],
  ['CGML-9.1-1-2', req(MUST, 'RW', EXT_DISPLAY, INTEGRATION)],
  ['CGML-9.1-1-3', req(MUST, 'RWX', EXT_DISPLAY, INTEGRATION)],
  ['CGML-9.1-1-3-1', req(MUST, 'RW', EXT_DISPLAY, INTEGRATION)],
  ['CGML-9.1-1-3-2', req(MUST, 'RW', EXT_DISPLAY, INTEGRATION)],
  ['CGML-9.1-1-3-3', req(MUST, 'RW', EXT_DISPLAY, INTEGRATION)],
  ['CGML-9.1-1-3-4', req(MUST, 'RWX', EXT_DISPLAY, VALIDATOR)],
  ['CGML-9.1-1-4', req(MAY, 'RW', EXT_DISPLAY, INTEGRATION)],
  ['CGML-9.1-1-5', req(MUST, 'RW', EXT_DISPLAY, INTEGRATION)],
  ['CGML-9.1-2', req(MUST, 'W', EXT_DISPLAY, WRITE_ONLY)],
  // 9.2 Color marking
  ['CGML-9.2-1', req(MAY, 'RW', EXT_DISPLAY, VALIDATOR)],
  ['CGML-9.2-2', req(MUST, 'RWX', EXT_DISPLAY, VALIDATOR)],
  ['CGML-9.2-3', req(SHOULD, 'RW', EXT_DISPLAY, VALIDATOR)],
  ['CGML-9.2-4', req(MUST, 'RW', EXT_DISPLAY, VALIDATOR)],
  // 9.3 Comment markup
  ['CGML-9.3-1', req(MAY, 'RW', EXT_DISPLAY, VALIDATOR)],
  ['CGML-9.3-2', req(MUST, 'RWX', EXT_DISPLAY, VALIDATOR)],
  ['CGML-9.3-3', req(MAY, 'RW', EXT_DISPLAY, INTEGRATION)],
  ['CGML-9.3-4', req(MUST, 'RWX', EXT_DISPLAY, INTEGRATION)],
  // 10.1 Formal names
  ['CGML-10.1-1', req(MAY, 'RW', EXT_PLATFORM, INTEGRATION)],
  ['CGML-10.1-2', req(MUST, 'RWX', EXT_PLATFORM, VALIDATOR)],
  ['CGML-10.1-3', req(MUST, 'RWX', EXT_PLATFORM, VALIDATOR)],
  // 10.2 Formal comments for initialization
  ['CGML-10.2-1', req(MAY, 'RW', EXT_PLATFORM, INTEGRATION)],
  // 10.3 Dynamic components
  ['CGML-10.3-1', req(MUST, 'RWX', EXT_PLATFORM, VALIDATOR)],
  ['CGML-10.3-2', req(MUST, 'RW', EXT_PLATFORM, INTEGRATION)],
  // Appendix Document tag tree
  ['CGML-appendix-A-1', req(MUST, 'RWX', CORE, VALIDATOR)],
  // Appendix Standard key declarations
  ['CGML-appendix-B-1', req(MUST, 'RWX', CORE, VALIDATOR)],
]);

// the informative Lapki dialect (CyberiadaML-GraphML-1.0-LAPKI-DIALECT.md):
// outside the standard, kept apart from REQUIREMENTS and its audits
export const DIALECT_REQUIREMENTS: Map<string, string> = new Map([
  ['LAPKI-D1', 'several metadata nodes'],
  ['LAPKI-D2', 'old component comments'],
  ['LAPKI-D3', 'region graph id equal to a node id'],
  ['LAPKI-D4', 'geometry kinds'],
  ['LAPKI-D5', 'private keys of the Lapki IDE'],
  ['LAPKI-D6', 'format label'],
  ['LAPKI-D7', 'structural leniency'],
  ['LAPKI-D8', 'values'],
  ['LAPKI-D9', 'function graphs'],
]);
