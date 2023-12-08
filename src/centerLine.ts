import { LineType, PointType } from './type';
import simplify from 'simplify-js';

/**
 * 根据两条车道线，自动生成中心线
 */
export function generateCenterLine(left: LineType, right: LineType): LineType {
  const maxPointCount = left.length * right.length;
  // 两条线的点序列分别线性插值至点数目相等
  const leftAfterInterpolate = interpolatePoints(left, maxPointCount);
  const rightAfterInterpolate = interpolatePoints(right, maxPointCount);
  if (leftAfterInterpolate.length !== rightAfterInterpolate.length) {
    throw new Error(
      `Error: the point count of both line is not same after interpolation.`
    );
  }
  // 两两点计算中点，然后连成一条中心多段线
  const totalCenterLine: LineType = [];
  for (let i = 0; i < leftAfterInterpolate.length; ++i) {
    const leftPoint = leftAfterInterpolate[i];
    const rightPoint = rightAfterInterpolate[i];
    totalCenterLine.push({
      x: (leftPoint.x + rightPoint.x) / 2,
      y: (leftPoint.y + rightPoint.y) / 2
    });
  }
  // 对中心多段线的点序列进行道格拉斯抽稀
  const simplifiedLine = simplify(totalCenterLine, 5, true);
  // 最后抽稀后的点是最终中心线的关键点
  return simplifiedLine;
}

function interpolatePoints(line: LineType, maxPointCount: number) {
  // 插值后的点序列
  const pointsAfterInterpolate: PointType[] = [];

  // 这条线的总距离
  const totalDistanceX = line[line.length - 1].x - line[0].x;
  // 要插值的点的剩余总数
  let toInterpolatePointsRestTotalCount = maxPointCount - line.length;
  // 计算两两点之间的距离，通过计算每个两两点之间的距离与总距离的比值来划分每段线需要的插值
  let startPoint = line[0];
  pointsAfterInterpolate.push(startPoint);
  for (let i = 1; i < line.length; ++i) {
    const endPoint = line[i];
    const distanceX = endPoint.x - startPoint.x;
    const distanceY = endPoint.y - startPoint.y;
    // 计算当前两个点之间应该插入的点数；如果是最后一段距离的话，则把剩余的点数全部算进去
    const toInterpolatePointsCount =
      i === line.length - 1
        ? toInterpolatePointsRestTotalCount
        : Math.round(
            (distanceX / totalDistanceX) * toInterpolatePointsRestTotalCount
          );
    // 线性插值
    const stepX = distanceX / (toInterpolatePointsCount + 1);
    const stepY = distanceY / (toInterpolatePointsCount + 1);
    for (let j = 0; j < toInterpolatePointsCount; ++j) {
      pointsAfterInterpolate.push({
        x: startPoint.x + stepX * (j + 1),
        y: startPoint.y + stepY * (j + 1)
      });
    }

    pointsAfterInterpolate.push(endPoint);

    startPoint = endPoint;
    toInterpolatePointsRestTotalCount -= toInterpolatePointsCount;
  }

  return pointsAfterInterpolate;
}
