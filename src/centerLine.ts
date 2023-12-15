import { type IPoint, type ILine, RLine, RPoint } from './type';
// @ts-ignore
import jsts from 'jsts/dist/jsts.min.js';
import proj from 'proj4';
import { type Feature, type Point } from '@turf/turf';
import tLength from '@turf/length';
import along from '@turf/along';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import distance from '@turf/distance';
import midpoint from '@turf/midpoint';
import simplify from '@turf/simplify';

// proj.defs([
//   [
//     'EPSG:4326',
//     '+proj=longlat +datum=WGS84 +no_defs +type=crs'
//   ], [
//     'EPSG:32748',
//     '+proj=utm +zone=48 +south +datum=WGS84 +units=m +no_defs +type=crs'
//   ]
// ]);
// const convertor = proj('epsg:4326', 'epsg:32748');

export function adjustCenterLine(lines: ILine[]): ILine[] {
  // // 先将经纬度转换成utm坐标
  const utmLines = lines.map((line) => {
    return new RLine(
      line.id,
      line.type,
      line.points.map((point) => {
        // const [x, y] = convertor.forward([point.x, point.y]);
        return new RPoint(point.id, point.x, point.y);
      })
    );
  });

  // 构建strTree结构
  // @ts-ignore
  const strTree = new jsts.index.strtree.STRtree();
  utmLines.forEach((line) => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    line.points.forEach((point) => {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    });

    strTree.insert(new jsts.geom.Envelope(minX, maxX, minY, maxY), line);
  });

  const adjustedUtmLines: RLine[] = [];
  /**
   * 遍历每条中心线:
   * 1. 每隔1米对中心线进行插值
   * 2. 遍历中心线上所有点：
   *  1. 从strTree中查询该点周边4米范围，与之相交的所有车道线
   *  2. 遍历所有相交的车道线：
   *    1. 查找这条线上与这个点的最近点，并求出距离
   *    2. 判断方向：在左还是在右
   *  3. 判断是否左右都有最近点，如果有一个方向没有，那么跳过此循环逻辑
   *  4. 分别求出左边和右边最近的点，然后校准中心，得到校准后的坐标
   *  5. 更新校准坐标
   * 3. 拿到校准后的中心线的点列表，更新线对象
   */
  utmLines
    .filter((line) => line.type === 'center_line')
    .forEach((line) => {
      // 每隔1米对中心线进行插值
      const totalLength = tLength(line.geoJson);
      const interval = 0.001;
      let length = interval;
      const interpolatedPoints: RPoint[] = [line.points[0]];
      while (length < totalLength) {
        const [x, y] = along(line.geoJson, length).geometry.coordinates;
        interpolatedPoints.push(new RPoint('', x, y));

        length += interval;
      }
      interpolatedPoints.push(line.points[line.points.length - 1]);

      // 校准后的中心线的点列表
      const adjustedPoints: RPoint[] = [];

      // 遍历中心线上所有点
      interpolatedPoints.forEach((originalCenterPoint) => {
        // 从strTree中查询该点周边4米范围，与之相交的所有车道线
        const bufferDistance = 0.00001;
        // @ts-ignore
        const intersectedLines: { array: RLine[] } = strTree.query(
          new jsts.geom.Envelope(
            originalCenterPoint.x - bufferDistance,
            originalCenterPoint.x + bufferDistance,
            originalCenterPoint.y - bufferDistance,
            originalCenterPoint.y + bufferDistance
          )
        );

        let leftMinDis: number | undefined;
        let leftClosestPoint: Feature<Point> | undefined;
        let rightMinDis: number | undefined;
        let rightClosestPoint: Feature<Point> | undefined;

        // 遍历所有相交的车道线
        intersectedLines.array
          .filter((line) => line.type !== 'center_line')
          .forEach((line) => {
            // 查找这条线上与这个点的最近点，并求出距离
            const closestPoint = nearestPointOnLine(
              line.geoJson,
              originalCenterPoint.geoJson
            );
            const d = distance(originalCenterPoint.geoJson, closestPoint);

            // 判断方向：在左还是在右
            const orient = judgeOrientaition(
              interpolatedPoints[0],
              originalCenterPoint,
              {
                x: closestPoint.geometry.coordinates[0],
                y: closestPoint.geometry.coordinates[1]
              }
            );

            if (orient > 0) {
              if (leftMinDis === undefined || d < leftMinDis) {
                leftMinDis = d;
                leftClosestPoint = closestPoint;
              }
            } else if (orient < 0) {
              if (rightMinDis === undefined || d < rightMinDis) {
                rightMinDis = d;
                rightClosestPoint = closestPoint;
              }
            }
          });

        // 判断是否左右都有最近点，如果有一个方向没有，那么跳过此循环逻辑
        if (leftClosestPoint === undefined || rightClosestPoint === undefined) {
          return;
        }

        // 分别求出左边和右边最近的点，然后校准中心，得到校准后的坐标
        const middlePoint = midpoint(leftClosestPoint, rightClosestPoint);

        // 更新校准坐标
        adjustedPoints.push(
          new RPoint(
            originalCenterPoint.id,
            middlePoint.geometry.coordinates[0],
            middlePoint.geometry.coordinates[1]
          )
        );
      });

      if (adjustedPoints.length < 2) {
        return;
      }
      // 对校准后的线进行抽稀
      const rline = new RLine(line.id, line.type, adjustedPoints);
      const simplifiedLine = simplify(rline.geoJson, {
        tolerance: 0.0001,
        highQuality: true
      });

      // 拿到校准后的中心线的点列表，更新线对象
      adjustedUtmLines.push(
        new RLine(
          line.id,
          line.type,
          simplifiedLine.geometry.coordinates.map(
            (position) => new RPoint('', position[0], position[1])
          )
        )
      );
    });

  // // 再将utm坐标转回经纬度
  return adjustedUtmLines.map((line) => {
    return {
      id: line.id,
      type: line.type,
      points: line.points.map((point) => {
        // const [x, y] = convertor.inverse([point.x, point.y]);
        return { id: point.id, x: point.x, y: point.y };
      })
    };
  });
}

function judgeOrientaition(
  pointA: RPoint,
  pointB: RPoint,
  pointC: { x: number; y: number }
) {
  // Calculate vectors AB and AC
  const vector_AB = [pointB.x - pointA.x, pointB.y - pointA.y];
  const vector_AC = [pointC.x - pointA.x, pointC.y - pointA.y];

  // Calculate the cross product
  const crossProduct =
    vector_AB[0] * vector_AC[1] - vector_AB[1] * vector_AC[0];

  return crossProduct;
}
