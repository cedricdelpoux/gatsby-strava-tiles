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

// One shape per tile, or one shape per connected area -- same choice `Tiles`
// offers on the map, just as valid here since nothing a card draws goes
// through a URL to have a size limit in the first place
function toShapes(tiles, outlined) {
  return outlined
    ? tilesToOutline(tiles)
    : tiles.map((tile) => [tileToCoords(tile)])
}

// `coordinates` is one track (`[[lng, lat], ...]`) for a single activity, or
// several (`[[[lng, lat], ...], ...]`) for a card merging more than one --
// the same LineString/MultiLineString nesting GeoJSON itself uses to tell the
// two apart, so a single number at the second level means "not nested yet"
function asTracks(coordinates) {
  return typeof coordinates[0][0] === "number" ? [coordinates] : coordinates
}

const SIZE = {width: 600, height: 300}

// A map background is photographic enough that PNG is the wrong container:
// the same card is about seven times smaller as WebP
const FORMAT = {type: "webp", options: {quality: 85}}

// One activity card as an image buffer: the ground already covered around the
// ride(s), what it added, which tiles it closed in, and the track, drawn on a
// background. Nothing goes through a URL, so shape count and size are free.
async function renderActivityCard({
  // One activity's track, or several for a card merging more than one -- see
  // `asTracks` below
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
    // Per track, not on the flattened list: `pointsToTiles` fills in the
    // ground between consecutive points, and the last point of one day and
    // the first of the next are not ground anyone rode between
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

  // The three sets overlap, and a tile painted twice reads as a fourth colour,
  // so each layer is cut where the one above it already covers
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
    // Each badge counts what its own colour paints, so a tile both new and
    // newly closed in counts as new only -- the swatch has to match the area
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
