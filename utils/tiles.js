const {
  cellsAlongLine,
  distanceInMeters,
  lngToX,
  latToY,
  lngToXf,
  latToYf,
  xToLng,
  yToLat,
  Z,
} = require("./map")
const {roundTo5Decimals} = require("./utils")

// Beyond this, two consecutive points are treated as a GPS pause (train,
// ferry, tunnel...) rather than as ground actually covered, so the tiles
// between them are not counted
const MAX_GAP_METERS = 10000

function getTile({x, y}) {
  return {x, y}
}

function tileKey({x, y}) {
  return `${x}-${y}`
}

function uniqueTiles(tiles) {
  const seen = new Set()
  return tiles.filter((tile) => {
    const key = tileKey(tile)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function distinctTiles(tiles) {
  const excluded = new Set(tiles.map(tileKey))
  return (tile) => !excluded.has(tileKey(tile))
}

// `size` covers the square case; `width` and `height` the rectangles the max
// row and the max column need, both one tile thick
function tileToCoords({x, y, size = 1, width = size, height = size}) {
  const topLng = xToLng(x, Z)
  const topLat = yToLat(y, Z)
  const bottomLng = xToLng(x + width, Z)
  const bottomLat = yToLat(y + height, Z)

  return [
    [bottomLng, bottomLat],
    [bottomLng, topLat],
    [topLng, topLat],
    [topLng, bottomLat],
    [bottomLng, bottomLat],
  ]
}

function pointsToTiles(points, {detectGaps = false} = {}) {
  const tiles = []

  points.forEach((point, index) => {
    const [lng, lat] = point
    tiles.push(getTile({x: lngToX(lng), y: latToY(lat)}))

    if (index === 0) return

    const prevPoint = points[index - 1]

    // A pause: both recorded points count, the ground between them does not
    if (detectGaps && distanceInMeters(prevPoint, point) > MAX_GAP_METERS) {
      return
    }

    const [prevLng, prevLat] = prevPoint
    const cells = cellsAlongLine(
      lngToXf(prevLng),
      latToYf(prevLat),
      lngToXf(lng),
      latToYf(lat)
    )

    cells.forEach(({x, y}) => tiles.push(getTile({x, y})))
  })

  return uniqueTiles(tiles)
}

// Steps in tile space (x grows east, y grows south), in clockwise order, so
// `(dir + 1) % 4` is a right turn and `(dir + 3) % 4` a left one
const DIRECTIONS = [
  {dx: 1, dy: 0}, // 0 east
  {dx: 0, dy: 1}, // 1 south
  {dx: -1, dy: 0}, // 2 west
  {dx: 0, dy: -1}, // 3 north
]

// Each side of a tile as the neighbour that must be missing for it to be on
// the boundary, the corner it starts from, and the direction it runs in.
// Oriented so the covered tile is always on the right, which is what makes a
// ring's winding tell an outer boundary from a hole.
const SIDES = [
  {nx: 0, ny: -1, vx: 0, vy: 0, dir: 0}, // north side, runs east
  {nx: 1, ny: 0, vx: 1, vy: 0, dir: 1}, // east side, runs south
  {nx: 0, ny: 1, vx: 1, vy: 1, dir: 2}, // south side, runs west
  {nx: -1, ny: 0, vx: 0, vy: 1, dir: 3}, // west side, runs north
]

function edgeKey({x, y, dir}) {
  return `${x}-${y}-${dir}`
}

// The 4-connected groups of tiles. Splitting first means a group's boundary is
// its own outer ring plus its own holes, so `getRings` never has to work out
// which outer ring a hole belongs to.
function getComponents(tiles) {
  const tilesSet = new Set(tiles.map(tileKey))
  const visited = new Set()
  const components = []

  tiles.forEach((tile) => {
    if (visited.has(tileKey(tile))) return
    visited.add(tileKey(tile))

    const component = []
    const queue = [tile]

    while (queue.length > 0) {
      const {x, y} = queue.pop()
      component.push({x, y})

      DIRECTIONS.forEach(({dx, dy}) => {
        const neighbour = {x: x + dx, y: y + dy}
        const key = tileKey(neighbour)
        if (!tilesSet.has(key) || visited.has(key)) return
        visited.add(key)
        queue.push(neighbour)
      })
    }

    components.push(component)
  })

  return components
}

// Every boundary ring of one 4-connected group, as its corners in tile space.
// Rings running clockwise (positive `ringArea`) are outer boundaries, the ones
// running counter-clockwise are holes.
function getRings(component) {
  const tilesSet = new Set(component.map(tileKey))
  const edges = new Map()

  component.forEach(({x, y}) => {
    SIDES.forEach(({nx, ny, vx, vy, dir}) => {
      if (tilesSet.has(tileKey({x: x + nx, y: y + ny}))) return
      const edge = {x: x + vx, y: y + vy, dir}
      edges.set(edgeKey(edge), edge)
    })
  })

  const used = new Set()
  const rings = []

  edges.forEach((_, startKey) => {
    if (used.has(startKey)) return

    const ringEdges = []
    let key = startKey

    // Follow the boundary keeping covered tiles on the right. Every step
    // consumes one edge, so this ends after `edges.size` steps at the very
    // worst -- no iteration guard needed.
    while (edges.has(key) && !used.has(key)) {
      used.add(key)

      const edge = edges.get(key)
      ringEdges.push(edge)

      const {dx, dy} = DIRECTIONS[edge.dir]
      const corner = {x: edge.x + dx, y: edge.y + dy}

      // Right turn first, then straight, then left -- never back. Only
      // decides anything where two parts of a group touch diagonally: turning
      // right traces the pinch instead of cutting across it.
      key = [(edge.dir + 1) % 4, edge.dir, (edge.dir + 3) % 4]
        .map((dir) => edgeKey({...corner, dir}))
        .find((candidate) => edges.has(candidate) && !used.has(candidate))
    }

    // Only the corners: a straight run along the grid produces one edge per
    // tile, and keeping all of them would defeat the point of outlining
    const ring = ringEdges
      .filter((edge, index) => {
        const previous = ringEdges[(index || ringEdges.length) - 1]
        return edge.dir !== previous.dir
      })
      .map(({x, y}) => ({x, y}))

    rings.push(ring)
  })

  return rings
}

// Shoelace formula, exact here: tile corners are integers, so the sign needs
// none of the tolerance it would on projected coordinates.
function ringArea(ring) {
  return ring.reduce((area, {x, y}, index) => {
    const next = ring[(index + 1) % ring.length]
    return area + x * next.y - next.x * y
  }, 0)
}

function ringToCoords(ring) {
  // Tile corners sit 2.4 km apart at zoom 14, so a metre of precision is
  // already more than the grid carries, at half the bytes of the full float
  const coords = ring.map(({x, y}) => [
    roundTo5Decimals(xToLng(x)),
    roundTo5Decimals(yToLat(y)),
  ])

  // Latitude runs the opposite way to y, so projecting flips every winding;
  // reversing restores what GeoJSON expects -- outer rings counter-clockwise
  coords.reverse()

  return [...coords, coords[0]]
}

// The union of the tiles as GeoJSON MultiPolygon coordinates, holes included
function tilesToOutline(tiles) {
  return getComponents(uniqueTiles(tiles)).map((component) => {
    const rings = getRings(component)
    const outer = rings.filter((ring) => ringArea(ring) > 0)
    const holes = rings.filter((ring) => ringArea(ring) < 0)

    return [...outer, ...holes].map(ringToCoords)
  })
}

// Every tile of an axis-aligned rectangle, both corners included
function runToTiles({from, to}) {
  const tiles = []

  for (let x = from.x; x <= to.x; x++) {
    for (let y = from.y; y <= to.y; y++) {
      tiles.push(getTile({x, y}))
    }
  }

  return tiles
}

// Largest fully covered square, by the "maximal square in a binary grid"
// dynamic program: dp(x, y) is the side of the largest square starting at
// (x, y), built from the three one step down and right -- already known, since
// tiles are walked in decreasing x, then decreasing y.
function getSquare(tiles) {
  const dp = new Map()
  let maxSquare = {size: 0}

  const sorted = [...tiles].sort((a, b) => b.x - a.x || b.y - a.y)

  sorted.forEach(({x, y}) => {
    const size =
      1 +
      Math.min(
        dp.get(`${x + 1}-${y}`) || 0,
        dp.get(`${x}-${y + 1}`) || 0,
        dp.get(`${x + 1}-${y + 1}`) || 0
      )
    dp.set(`${x}-${y}`, size)

    if (size > maxSquare.size) {
      maxSquare = {x, y, size}
    }
  })

  return {
    size: maxSquare.size,
    tiles: runToTiles({
      from: maxSquare,
      to: {
        x: maxSquare.x + maxSquare.size - 1,
        y: maxSquare.y + maxSquare.size - 1,
      },
    }),
    // The square as one `size`-wide tile, in the same grid coordinates as
    // every other tile the plugin exposes
    border: maxSquare,
  }
}

// The longest unbroken run of covered tiles along one axis: `fixed` is the
// coordinate that stays the same along the run, `varying` the one that steps
// by one. Returns where the run starts and how long it is.
function getMaxRun(tiles, {fixed, varying}) {
  const lines = new Map()

  tiles.forEach((tile) => {
    const line = lines.get(tile[fixed]) || new Set()
    line.add(tile[varying])
    lines.set(tile[fixed], line)
  })

  let maxRun = {position: 0, start: 0, size: 0}

  lines.forEach((line, position) => {
    const sorted = [...line].sort((a, b) => a - b)
    let start = sorted[0]

    sorted.forEach((value, index) => {
      // A gap in the line starts a new run
      if (index > 0 && value !== sorted[index - 1] + 1) start = value

      const size = value - start + 1
      if (size > maxRun.size) maxRun = {position, start, size}
    })
  })

  return maxRun
}

// Longest east-west line of consecutive covered tiles: the "max row"
function getMaxRow(tiles) {
  const {
    position: y,
    start: x,
    size,
  } = getMaxRun(tiles, {
    fixed: "y",
    varying: "x",
  })

  return {
    size,
    tiles: runToTiles({from: {x, y}, to: {x: x + size - 1, y}}),
    // The run as a single tile `size` long and one tile thick, in the same
    // grid coordinates as every other tile the plugin exposes
    border: {x, y, width: size, height: 1},
  }
}

// Longest north-south line of consecutive covered tiles: the "max column"
function getMaxColumn(tiles) {
  const {
    position: x,
    start: y,
    size,
  } = getMaxRun(tiles, {
    fixed: "x",
    varying: "y",
  })

  return {
    size,
    tiles: runToTiles({from: {x, y}, to: {x, y: y + size - 1}}),
    border: {x, y, width: 1, height: size},
  }
}

function getCluster(tiles) {
  const tilesSet = new Set(tiles.map((tile) => `${tile.x}-${tile.y}`))
  const cluster = []

  tiles.forEach(({x, y}) => {
    if (
      tilesSet.has(`${x - 1}-${y}`) &&
      tilesSet.has(`${x + 1}-${y}`) &&
      tilesSet.has(`${x}-${y - 1}`) &&
      tilesSet.has(`${x}-${y + 1}`)
    ) {
      cluster.push({x, y})
    }
  })

  return cluster
}

function getMonthly(tilesByMonth) {
  return Object.keys(tilesByMonth).reduce((acc, yearMonth) => {
    const {old: oldTiles, new: newTiles} = tilesByMonth[yearMonth]
    const allTiles = [...oldTiles, ...newTiles]
    const square = getSquare(allTiles)
    const row = getMaxRow(allTiles)
    const column = getMaxColumn(allTiles)
    const cluster = getCluster(allTiles)
    const clusterTiles = cluster.filter(distinctTiles(square.tiles))
    const restTiles = allTiles.filter(
      distinctTiles([...square.tiles, ...cluster])
    )

    acc.push({
      yearMonth,
      year: yearMonth.substring(0, 4),
      month: yearMonth.substring(5, 7),
      parts: {
        squareBorder: square.border,
        squareSize: square.size,
        square: square.tiles,
        rowBorder: row.border,
        rowSize: row.size,
        row: row.tiles,
        columnBorder: column.border,
        columnSize: column.size,
        column: column.tiles,
        cluster: clusterTiles,
        rest: restTiles,
        new: newTiles,
        outlines: {
          square: tilesToOutline(square.tiles),
          cluster: tilesToOutline(clusterTiles),
          rest: tilesToOutline(restTiles),
          new: tilesToOutline(newTiles),
        },
      },
    })

    return acc
  }, [])
}

module.exports = {
  getCluster,
  getMaxColumn,
  getMaxRow,
  tilesToOutline,
  getSquare,
  getMonthly,
  uniqueTiles,
  distinctTiles,
  pointsToTiles,
  tileToCoords,
}
