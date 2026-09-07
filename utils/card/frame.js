const {lngToXf, latToYf, Z} = require("../map")

// The ground a card shows: the activity's extent plus a margin, grown to the
// card's shape. Everything drawn is clipped to it, tiles the ride missed too.
function getCardFrame({activityTiles, padding = 2, minSize = 8, aspect = 2}) {
  const xs = activityTiles.map(({x}) => x)
  const ys = activityTiles.map(({y}) => y)

  // Frame in fractional tile units, tile (x, y) spanning x..x+1
  let x0 = Math.min(...xs) - padding
  let x1 = Math.max(...xs) + 1 + padding
  let y0 = Math.min(...ys) - padding
  let y1 = Math.max(...ys) + 1 + padding

  // A short activity on ground already covered would otherwise fill its frame
  // with one flat colour, with no uncovered ground to read against
  const short = minSize - (x1 - x0)
  if (short > 0) {
    x0 -= short / 2
    x1 += short / 2
  }

  // Grow the short side rather than stretch: the extra room is always more map
  const width = x1 - x0
  const height = y1 - y0

  if (width / height < aspect) {
    const grow = (height * aspect - width) / 2
    x0 -= grow
    x1 += grow
  } else {
    const grow = (width / aspect - height) / 2
    y0 -= grow
    y1 += grow
  }

  return {x0, x1, y0, y1}
}

function project(frame, size) {
  const scale = size.width / (frame.x1 - frame.x0)

  return ([lng, lat]) => [
    (lngToXf(lng) - frame.x0) * scale,
    (latToYf(lat) - frame.y0) * scale,
  ]
}

// The overlay is drawn from geometry, so the background is fetched at whatever
// zoom matches the card's resolution, not at the zoom tiles are counted at
function getBackgroundZoom(frame, size) {
  const scale = size.width / (frame.x1 - frame.x0)

  return Math.max(0, Math.min(Z, Math.round(Z + Math.log2(scale / 256))))
}

function clipToFrame(frame, tiles) {
  return tiles.filter(
    ({x, y}) =>
      x + 1 > frame.x0 && x < frame.x1 && y + 1 > frame.y0 && y < frame.y1
  )
}

module.exports = {getCardFrame, getBackgroundZoom, clipToFrame, project}
