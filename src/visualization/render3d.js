export function polygonPoints(points) {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

export function renderFace(vertices, indices, fill, className, title = '') {
  const points = indices.map((faceIndex) => vertices[faceIndex]);
  const depth = points.reduce((total, point) => total + point.depth, 0) / points.length;
  return { depth, markup: `<polygon class="${className}" points="${polygonPoints(points)}" fill="${fill}">${title ? `<title>${title}</title>` : ''}</polygon>` };
}
