const {
  distinctTiles,
  pointsToTiles,
  tileToCoords,
  tilesToOutline,
} = require("../tiles")
const {getActivityCards} = require("./activities")
const {getBackground} = require("./background")
const {getCardFrame, getBackgroundZoom, clipToFrame} = require("./frame")
const {renderOverlay} = require("./overlay")
const {getSharp} = require("./sharp")

const STYLE = {
  covered: "#2ca57e",
  clustered: "#2563eb",
  added: "#f1c40f",
  track: "#ff00ff",
  // Only used when no map is drawn under the tiles
  background: "#e9e6e1",
  // The three coverage areas
  fillOpacity: 0.4,
  strokeOpacity: 1,
  strokeWidth: 1.5,
  trackWidth: 3,
  // The count badges
  badge: "#3b1d6e",
  badgeText: "#ffffff",
}

// One shape per tile, or one per connected area
function toShapes(tiles, outlined) {
  return outlined
    ? tilesToOutline(tiles)
    : tiles.map((tile) => [tileToCoords(tile)])
}

// One track (`[[lng, lat], ...]`), or several for a merged card, nested
// like a GeoJSON LineString/MultiLineString
function asTracks(coordinates) {
  return typeof coordinates[0][0] === "number" ? [coordinates] : coordinates
}

const SIZE = {width: 600, height: 300}

// About seven times smaller than PNG with a map background
const FORMAT = {type: "webp", options: {quality: 85}}

// One activity card as an image buffer: covered ground, added and closed
// in tiles, and the track(s), on a background
async function renderActivityCard({
  // One track, or several for a merged card (see `asTracks`)
  coordinates,
  added = [],
  clustered = [],
  coverage = [],
  // Defaults to the tiles the track(s) run through
  activityTiles,
  size = SIZE,
  padding = 2,
  minSize = 8,
  // Leave out to draw on a flat background: no request, no token, no landmark
  tileUrl,
  cacheDir,
  style: overrides,
  format = FORMAT,
  outlined = true,
}) {
  const sharp = getSharp()
  const style = {...STYLE, ...overrides}
  const tracks = asTracks(coordinates)

  const frame = getCardFrame({
    // Per track, so no tiles are filled in between two days
    activityTiles:
      activityTiles || tracks.flatMap((track) => pointsToTiles(track)),
    padding,
    minSize,
    aspect: size.width / size.height,
  })
  const zoom = getBackgroundZoom(frame, size)
  const background = await getBackground({
    frame,
    size,
    zoom,
    tileUrl,
    cacheDir,
    color: style.background,
  })

  // Each layer is cut where the one above covers it, to paint tiles once
  const addedInFrame = clipToFrame(background.frame, added)
  const clusteredInFrame = clipToFrame(background.frame, clustered).filter(
    distinctTiles(addedInFrame)
  )
  const coveredInFrame = clipToFrame(background.frame, coverage).filter(
    distinctTiles([...addedInFrame, ...clusteredInFrame])
  )

  const overlay = renderOverlay({
    // the frame the background was really cut on, so the two line up exactly
    frame: background.frame,
    size,
    layers: [
      {tiles: toShapes(coveredInFrame, outlined), color: style.covered},
      {tiles: toShapes(clusteredInFrame, outlined), color: style.clustered},
      {tiles: toShapes(addedInFrame, outlined), color: style.added},
    ],
    fillOpacity: style.fillOpacity,
    strokeOpacity: style.strokeOpacity,
    strokeWidth: style.strokeWidth,
    tracks,
    track: style.track,
    trackWidth: style.trackWidth,
    badge: style.badge,
    badgeText: style.badgeText,
    // A tile both new and closed in counts as new only, like its colour
    counts: [
      {count: addedInFrame.length, color: style.added},
      {count: clusteredInFrame.length, color: style.clustered},
      {count: coveredInFrame.length, color: style.covered},
    ],
  })

  const image = await sharp(background.image)
    .composite([{input: Buffer.from(overlay)}])
    [format.type](format.options)
    .toBuffer()

  return {image, zoom, backgroundTiles: background.tiles}
}

module.exports = {getActivityCards, renderActivityCard, STYLE, SIZE}
