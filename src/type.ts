import type { Point, LineString, Feature } from '@turf/turf';
import { point, lineString } from '@turf/helpers';

export type LineType =
  | 'center_line'
  | 'dotted_white'
  | 'dotted_yellow'
  | 'solid_white'
  | 'solid_yellow'
  | 'stop_line'
  | 'topo_line'
  | 'virtual_topo'
  | 'debug_line';

export interface IPoint {
  id: string;
  x: number;
  y: number;
}

export interface ILine {
  id: string;
  type: LineType;
  points: IPoint[];
}

export class RPoint {
  geoJson: Feature<Point>;

  constructor(
    public readonly id: string,
    public readonly x: number,
    public readonly y: number
  ) {
    this.geoJson = point([x, y]);
  }
}

export class RLine {
  geoJson: Feature<LineString>;

  constructor(
    public readonly id: string,
    public readonly type: LineType,
    public readonly points: RPoint[] = []
  ) {
    this.geoJson = lineString(points.map((point) => [point.x, point.y]));
  }
}
