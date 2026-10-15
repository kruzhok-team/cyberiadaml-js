/* -----------------------------------------------------------------------------
 * The Cyberiada State Machine JavaScript Library
 *
 * The validation findings and reports
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

export const ERROR = 'ERROR';
export const WARNING = 'WARNING';
export const INFO = 'INFO';

export const LAST_LAYER = 4;

/** A finding of a rule, with its requirement and position. */
export class Finding {
  constructor(
    public rule: string,
    public req: string | null,
    public layer: number,
    public severity: string,
    public message: string,
    public line: number | null = null,
    public column: number | null = null,
    public path: string | null = null,
  ) {}

  /** The text line of the finding. */
  render(filename: string): string {
    let pos = '';
    if (this.line !== null) {
      pos = `:${this.line}`;
      if (this.column !== null) {
        pos += `:${this.column}`;
      }
    }
    const req = this.req ? ` ${this.req}` : '';
    const at = this.path ? ` (at ${this.path})` : '';
    return `${filename}${pos}: ${this.severity}${req} [L${this.layer}] ${this.message}${at}`;
  }
}

/** The findings of one document run through the validation layers. */
export class Report {
  findings: Finding[] = [];
  layersRun: number[] = [];

  add(finding: Finding): void {
    this.findings.push(finding);
  }

  hasErrors(layer: number | null = null): boolean {
    return this.findings.some((f) => f.severity === ERROR && (layer === null || f.layer === layer));
  }

  hasWarnings(): boolean {
    return this.findings.some((f) => f.severity === WARNING);
  }

  valid(strict: boolean = false): boolean {
    if (this.hasErrors()) {
      return false;
    }
    return !(strict && this.hasWarnings());
  }

  /** The verdict word. */
  verdict(strict: boolean = false): string {
    return this.valid(strict) ? 'valid' : 'invalid';
  }
}
