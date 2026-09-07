const {project} = require("./frame")

const round = (n) => Math.round(n * 10) / 10

// One MultiPolygon as a single SVG path. `evenodd` is what makes the holes in
// the outline actual holes rather than shapes drawn on top.
function multiPolygonToPath(multiPolygon, to) {
  return multiPolygon
    .flat()
    .map(
      (ring) =>
        "M" +
        ring
          .map(to)
          .map(([x, y]) => `${round(x)},${round(y)}`)
          .join("L") +
        "Z"
    )
    .join("")
}

function lineToPath(coordinates, to) {
  return (
    "M" +
    coordinates
      .map(to)
      .map(([x, y]) => `${round(x)},${round(y)}`)
      .join("L")
  )
}

// Each track its own subpath -- a multi-day card must not draw a straight
// line from where one day's track ends to where the next one starts
function tracksToPath(tracks, to) {
  return tracks.map((track) => lineToPath(track, to)).join(" ")
}

// Laid out from the right so the leftmost badge is the last one given, which
// keeps the counts in the same order as the layers they describe
function badges(counts, size, badge, badgeText) {
  const height = 26
  const gap = 6
  let right = size.width - 10

  return counts
    .filter(({count}) => count > 0)
    .reverse()
    .map(({count, color}) => {
      const width = 26 + String(count).length * 11
      right -= width
      const x = right
      right -= gap

      return `
        <g>
          <rect x="${x}" y="10" width="${width}" height="${height}" rx="${
        height / 2
      }" fill="${badge}"/>
          <circle cx="${x + 14}" cy="23" r="6" fill="${color}"/>
          <text x="${x + width - 10}" y="28" text-anchor="end"
                font-family="system-ui, sans-serif" font-size="15"
                font-weight="700" fill="${badgeText}">${count}</text>
        </g>`
    })
    .join("")
}

function renderOverlay({
  frame,
  size,
  layers,
  fillOpacity,
  strokeOpacity,
  strokeWidth,
  tracks,
  track,
  trackWidth,
  badge,
  badgeText,
  counts,
}) {
  const to = project(frame, size)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${
    size.width
  }" height="${size.height}">
    ${layers
      .filter(({tiles}) => tiles.length > 0)
      .map(
        ({tiles, color}) => `
    <path d="${multiPolygonToPath(tiles, to)}" fill-rule="evenodd"
          fill="${color}" fill-opacity="${fillOpacity}"
          stroke="${color}" stroke-opacity="${strokeOpacity}" stroke-width="${strokeWidth}"/>`
      )
      .join("")}
    <path d="${tracksToPath(tracks, to)}" fill="none"
          stroke="${track}" stroke-width="${trackWidth}"
          stroke-linejoin="round" stroke-linecap="round"/>
    ${badges(counts, size, badge, badgeText)}
  </svg>`
}

module.exports = {renderOverlay}
