export function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
export function projectBox(placement, view) {
  const { positionMm: position, orientationMm: size } = placement;
  if (view === 'side') return { x: position.x, y: position.z, width: size.length, height: size.height };
  if (view === 'front') return { x: position.y, y: position.z, width: size.width, height: size.height };
  return { x: position.x, y: position.y, width: size.length, height: size.width };
}
export function createBoxVertices(position, size) { const {x,y,z}=position; const {length,width,height}=size; return [{x,y,z},{x:x+length,y,z},{x:x+length,y:y+width,z},{x,y:y+width,z},{x,y,z:z+height},{x:x+length,y,z:z+height},{x:x+length,y:y+width,z:z+height},{x,y:y+width,z:z+height}]; }
export function normalizeYaw(yaw){ return ((yaw % 360) + 360) % 360; }
export function rotatePoint3d(point, center, angles){ const cosYaw=Math.cos(angles.yaw);const sinYaw=Math.sin(angles.yaw);const cosPitch=Math.cos(angles.pitch);const sinPitch=Math.sin(angles.pitch);const centeredX=point.x-center.x;const centeredY=point.y-center.y;const centeredZ=point.z-center.z;const rotatedX=centeredX*cosYaw-centeredY*sinYaw;const rotatedY=centeredX*sinYaw+centeredY*cosYaw;return {x:rotatedX,y:rotatedY*cosPitch-centeredZ*sinPitch,depth:rotatedY*sinPitch+centeredZ*cosPitch}; }
export function createProjector(zone, placements, canvasWidth, canvasHeight, padding, extraPoints = [], angles) {
  const dimensions = zone.dimensionsMm; const center = { x: dimensions.length / 2, y: dimensions.width / 2, z: dimensions.height / 2 };
  const allPoints=[...createBoxVertices({x:0,y:0,z:0},dimensions),...placements.flatMap((p)=>createBoxVertices(p.positionMm,p.orientationMm)),...extraPoints];
  const raw=(point)=>rotatePoint3d(point,center,angles);
  const maxRadius=Math.max(...allPoints.map((point)=>Math.hypot(point.x-center.x,point.y-center.y,point.z-center.z)),1);
  const scale=Math.min((canvasWidth-padding*2)/(maxRadius*2),(canvasHeight-padding*2)/(maxRadius*2));
  return (point)=>{const output=raw(point); return {x:canvasWidth/2+output.x*scale,y:canvasHeight/2+output.y*scale,depth:output.depth};};
}
