const Z = 14
const EARTH_RADIUS_METERS = 6371000

function lngToXf(lng) {
  return ((lng + 180) / 360) * Math.pow(2, Z)
}

function latToYf(lat) {
  return (
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
    Math.pow(2, Z)
  )
}

function lngToX(lng) {
  return Math.floor(lngToXf(lng))
}

function latToY(lat) {
  return Math.floor(latToYf(lat))
}

function xToLng(x) {
  return (x / Math.pow(2, Z)) * 360 - 180
}

function yToLat(y) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, Z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

function distanceInMeters([lng1, lat1], [lng2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a))
}

// Every grid cell the straight line between two continuous (x, y) tile-space
// coordinates crosses, found by stepping to whichever axis boundary comes
// first (Amanatides & Woo voxel traversal). Exact: unlike sampling points
// along the segment, it cannot miss a tile the line only clips at a corner.
function cellsAlongLine(x0, y0, x1, y1) {
  let x = Math.floor(x0)
  let y = Math.floor(y0)
  const endX = Math.floor(x1)
  const endY = Math.floor(y1)
  const dx = x1 - x0
  const dy = y1 - y0
  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0
  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity
  let tMaxX =
    dx !== 0 ? Math.abs((stepX > 0 ? x + 1 - x0 : x0 - x) / dx) : Infinity
  let tMaxY =
    dy !== 0 ? Math.abs((stepY > 0 ? y + 1 - y0 : y0 - y) / dy) : Infinity

  const cells = [{x, y}]

  while (x !== endX || y !== endY) {
    if (tMaxX < tMaxY) {
      x += stepX
      tMaxX += tDeltaX
    } else if (tMaxY < tMaxX) {
      y += stepY
      tMaxY += tDeltaY
    } else {
      // Passes exactly through a grid corner: both axes cross at once
      x += stepX
      y += stepY
      tMaxX += tDeltaX
      tMaxY += tDeltaY
    }
    cells.push({x, y})
  }

  return cells
}

module.exports = {
  cellsAlongLine,
  distanceInMeters,
  lngToX,
  latToY,
  lngToXf,
  latToYf,
  xToLng,
  yToLat,
  Z,
}
