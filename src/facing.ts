/**
 * 线贴边校正
 * 1. 先取线的两个端点与边缘线的最近点
 * 2. 分别计算两个端点与最近点的距离
 * 3. 将线进行线性插值
 * 4. 按照比例算出每个点应该与边缘线最近的距离，然后校准各个点
 * 5. 最后抽稀
 */
import { type IPoint, type ILine, RLine, RPoint } from './type';
import tLength from '@turf/length';
import along from '@turf/along';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import distance from '@turf/distance';
import bearing from '@turf/bearing';
import destination from '@turf/destination';
import simplify from '@turf/simplify';

export function attachLine(
  line: ILine,
  targetLine: ILine,
  { debug = false }: { debug?: boolean } = {}
): {
  line: ILine;
  debugLines: ILine[];
} {
  if (line.points.length < 2) {
    return { line, debugLines: [] };
  }
  // // 取中心线两个端点，连成一条直线，在这条线上进行插值校准
  // const utmLine = new RLine(line.id, line.type, [
  //   new RPoint(line.points[0].id, line.points[0].x, line.points[0].y),
  //   new RPoint(
  //     line.points[line.points.length - 1].id,
  //     line.points[line.points.length - 1].x,
  //     line.points[line.points.length - 1].y
  //   )
  // ]);
  const utmLine = new RLine(
    line.id,
    line.type,
    line.points.map((point) => new RPoint(point.id, point.x, point.y))
  );
  const utmTargetLine = new RLine(
    targetLine.id,
    targetLine.type,
    targetLine.points.map((point) => {
      return new RPoint(point.id, point.x, point.y);
    })
  );
  // 调试线
  const debugLines: ILine[] = [];

  // 先取线的两个端点与边缘线的最近点
  const startVertex = utmLine.points[0];
  const endVertex = utmLine.points[utmLine.points.length - 1];

  const startClosestPoint = nearestPointOnLine(
    utmTargetLine.geoJson,
    startVertex.geoJson
  );
  const endClosestPoint = nearestPointOnLine(
    utmTargetLine.geoJson,
    endVertex.geoJson
  );

  // 分别计算两个端点与最近点的距离
  const distanceOfStartAndClosest = distance(
    startVertex.geoJson,
    startClosestPoint
  );
  const distanceOfEndAndClosest = distance(endVertex.geoJson, endClosestPoint);

  // 将线进行线性插值
  const totalLength = tLength(utmLine.geoJson);
  const interval = 0.001;
  let length = interval;
  const interpolatedPoints: RPoint[] = [utmLine.points[0]];
  while (length < totalLength) {
    const [x, y] = along(utmLine.geoJson, length).geometry.coordinates;
    interpolatedPoints.push(new RPoint('', x, y));

    length += interval;
  }
  interpolatedPoints.push(utmLine.points[utmLine.points.length - 1]);

  // 按照比例算出每个点应该与边缘线最近的距离，然后校准各个点
  let lastLength = 0;
  let lastClosestPoint = startClosestPoint;
  for (let i = 1; i < interpolatedPoints.length - 1; ++i) {
    const currentVertex = interpolatedPoints[i];
    const currentClosestPoint = nearestPointOnLine(
      utmTargetLine.geoJson,
      currentVertex.geoJson
    );
    // 计算比例
    const currentLength =
      lastLength + distance(lastClosestPoint, currentClosestPoint);
    const shouldDistanceOfCurrentAndClosest =
      distanceOfStartAndClosest +
      (currentLength / totalLength) *
        (distanceOfEndAndClosest - distanceOfStartAndClosest);
    // 校准点
    const currentBearing = bearing(currentClosestPoint, currentVertex.geoJson);
    const shoudVertex = destination(
      currentClosestPoint,
      shouldDistanceOfCurrentAndClosest,
      currentBearing
    );
    interpolatedPoints[i] = new RPoint(
      '',
      shoudVertex.geometry.coordinates[0],
      shoudVertex.geometry.coordinates[1]
    );
    if (debug) {
      debugLines.push({
        id: '',
        type: 'debug_line',
        points: [
          {
            id: '',
            x: shoudVertex.geometry.coordinates[0],
            y: shoudVertex.geometry.coordinates[1]
          },
          {
            id: '',
            x: currentClosestPoint.geometry.coordinates[0],
            y: currentClosestPoint.geometry.coordinates[1]
          }
        ]
      });
    }

    lastLength = currentLength;
    lastClosestPoint = currentClosestPoint;
  }

  // 最后抽稀
  const rline = new RLine(line.id, line.type, interpolatedPoints);
  if (debug) {
    return {
      line: {
        id: line.id,
        type: line.type,
        points: rline.points.map((position) => ({
          id: '',
          x: position.x,
          y: position.y
        }))
      },
      debugLines
    };
  } else {
    const simplifiedLine = simplify(rline.geoJson, {
      tolerance: 0.000001,
      highQuality: true
    });

    return {
      line: {
        id: line.id,
        type: line.type,
        points: simplifiedLine.geometry.coordinates.map((position) => ({
          id: '',
          x: position[0],
          y: position[1]
        }))
      },
      debugLines
    };
  }
}
