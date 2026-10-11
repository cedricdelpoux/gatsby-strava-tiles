const {pointsToTiles} = require("./tiles")

// `summary_polyline` points can be hundreds of meters apart
const STEP_METERS = 20
// Wider than GPS drift, narrower than two parallel roads
const NEAR_METERS = 40
// How far a cut end moves back, so converging tracks don't stick together
const CLEAR_METERS = 80
// A shorter new stretch between two drawn roads is GPS drift
const MIN_NEW_RUN_METERS = 150
// A shorter shared stretch mid-track, like a crossing, isn't worth a cut
const MIN_CUT_METERS = 150
// Dashes before a cut, ~15 px on screen at any zoom: each band, twice as long
// as the previous one, is dashed one zoom level lower
const STUB_BANDS_METERS = [50, 100, 200, 400, 800, 1600]
const STUB_FIRST_ZOOM = 15
const ALWAYS_DASHED = 24
// At these zooms, a pass closer than GENERALIZE_PIXELS to a drawn line is
// hidden, so the zoomed-out map has no blobs or double lines
const GENERALIZE_ZOOMS = [12, 11, 10, 9, 8, 7]
const GENERALIZE_PIXELS = 3
// So that a mere crossing stays drawn
const GENERALIZE_MIN_RUN_FACTOR = 3
// A shorter visible bit between two hidden passes is hidden too
const GENERALIZE_MIN_VISIBLE_FACTOR = 2
// Otherwise every point would be redundant with its own neighbours
const GENERALIZE_SELF_GAP_FACTOR = 4
// Meters per pixel at zoom 0 on the equator, with 512 px Mapbox tiles
const METERS_PER_PIXEL_Z0 = 78271.5

// Invisible on screen, and a `latlng` stream drops to a few hundred points
const SIMPLIFY_METERS = 3

const METERS_PER_DEGREE = 111320

const toMeters = ([lng, lat]) => [
  lng * METERS_PER_DEGREE * Math.cos((lat * Math.PI) / 180),
  lat * METERS_PER_DEGREE,
]

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

const round = (value) => Math.round(value * 1e5) / 1e5

const byStartDate = (a, b) =>
  a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0

// `seg` ties each point to its original segment, to cut without losing vertices
function densify(coordinates) {
  const points = []

  coordinates.forEach((coord, index) => {
    const [x, y] = toMeters(coord)
    const point = {coord, x, y, seg: index}

    if (index > 0) {
      const prev = points[points.length - 1]
      const steps = Math.floor(distance(prev, point) / STEP_METERS)
      const [prevLng, prevLat] = coordinates[index - 1]
      const [lng, lat] = coord

      for (let step = 1; step < steps; step++) {
        const t = step / steps
        points.push({
          coord: [prevLng + (lng - prevLng) * t, prevLat + (lat - prevLat) * t],
          x: prev.x + (x - prev.x) * t,
          y: prev.y + (y - prev.y) * t,
          seg: index - 1,
        })
      }
    }

    points.push(point)
  })

  return points
}

// Hash grid: a near point can only be in a neighbouring cell
function createTrace(cellSize = NEAR_METERS) {
  const cells = new Map()
  const keyOf = (cx, cy) => `${cx}:${cy}`

  return {
    add(point) {
      const key = keyOf(
        Math.floor(point.x / cellSize),
        Math.floor(point.y / cellSize)
      )
      if (!cells.has(key)) cells.set(key, [])
      cells.get(key).push(point)
    },
    isNear(point, radius = NEAR_METERS, ignoredOwner = null) {
      const cx = Math.floor(point.x / cellSize)
      const cy = Math.floor(point.y / cellSize)
      const reach = Math.ceil(radius / cellSize)

      for (let dx = -reach; dx <= reach; dx++) {
        for (let dy = -reach; dy <= reach; dy++) {
          const cell = cells.get(keyOf(cx + dx, cy + dy))
          if (
            cell &&
            cell.some(
              (other) =>
                other.owner !== ignoredOwner && distance(point, other) <= radius
            )
          ) {
            return true
          }
        }
      }

      return false
    },
  }
}

function getRuns(points, covered) {
  const runs = []

  points.forEach((point, i) => {
    const last = runs[runs.length - 1]

    if (last && last.covered === covered[i]) {
      last.end = i
      last.length += distance(points[i - 1], point)
    } else {
      runs.push({covered: covered[i], start: i, end: i, length: 0})
    }
  })

  return runs
}

function mergeRuns(runs) {
  return runs.reduce((merged, run) => {
    const last = merged[merged.length - 1]

    if (last && last.covered === run.covered) {
      last.end = run.end
      last.length += run.length
    } else {
      merged.push({...run})
    }

    return merged
  }, [])
}

function getKeptRanges(points, covered) {
  let runs = getRuns(points, covered)

  if (runs.every((run) => !run.covered)) return [[0, points.length - 1]]

  runs = mergeRuns(
    runs.map((run) =>
      !run.covered && run.length < MIN_NEW_RUN_METERS
        ? {...run, covered: true}
        : run
    )
  )
  runs = mergeRuns(
    runs.map((run, i) =>
      run.covered && i > 0 && i < runs.length - 1 && run.length < MIN_CUT_METERS
        ? {...run, covered: false}
        : run
    )
  )

  return runs.filter((run) => !run.covered).map((run) => [run.start, run.end])
}

// The activity's own start and end never move
function clearRange(points, trace, [start, end]) {
  let first = start
  let last = end

  if (start > 0) {
    while (first < last && trace.isNear(points[first], CLEAR_METERS)) first++
  }
  if (end < points.length - 1) {
    while (last > first && trace.isNear(points[last], CLEAR_METERS)) last--
  }

  return first < last ? [first, last] : null
}

// Iterative Douglas-Peucker, on the coordinates projected in meters
function simplify(coordinates) {
  if (coordinates.length < 3) return coordinates

  const projected = coordinates.map(toMeters)
  const keep = new Uint8Array(coordinates.length)
  keep[0] = keep[coordinates.length - 1] = 1
  const stack = [[0, coordinates.length - 1]]

  while (stack.length > 0) {
    const [first, last] = stack.pop()
    const [ax, ay] = projected[first]
    const [bx, by] = projected[last]
    const dx = bx - ax
    const dy = by - ay
    const lengthSquared = dx * dx + dy * dy
    let maxDistance = 0
    let index = -1

    for (let i = first + 1; i < last; i++) {
      const [px, py] = projected[i]
      const t =
        lengthSquared === 0
          ? 0
          : Math.max(
              0,
              Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared)
            )
      const d = Math.hypot(px - ax - t * dx, py - ay - t * dy)

      if (d > maxDistance) {
        maxDistance = d
        index = i
      }
    }

    if (maxDistance > SIMPLIFY_METERS) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }

  return coordinates
    .filter((_, i) => keep[i])
    .map(([lng, lat]) => [round(lng), round(lat)])
}

function sliceTrack(coordinates, points, start, end) {
  const result = [points[start].coord]

  for (let seg = points[start].seg + 1; seg <= points[end].seg; seg++) {
    result.push(coordinates[seg])
  }

  const last = points[end].coord
  const prev = result[result.length - 1]
  if (last[0] !== prev[0] || last[1] !== prev[1]) result.push(last)

  return simplify(result)
}

function getCumulativeDistances(points) {
  const cumulative = [0]

  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]))
  }

  return cumulative
}

function getBandDashUntil(meters) {
  const band = STUB_BANDS_METERS.findIndex((limit) => meters < limit)

  if (band === -1) return 0

  return band === 0 ? ALWAYS_DASHED : STUB_FIRST_ZOOM + 1 - band
}

// A short range between two cuts ends up fully dashed when zooming out
function getBandDashes(points, cumulative, [start, end], dashes) {
  const cutBefore = start > 0
  const cutAfter = end < points.length - 1

  for (let i = start; i <= end; i++) {
    const fromCut = Math.min(
      cutBefore ? cumulative[i] - cumulative[start] : Infinity,
      cutAfter ? cumulative[end] - cumulative[i] : Infinity
    )

    dashes[i] = Math.max(dashes[i], getBandDashUntil(fromCut))
  }
}

// Cells sized for the equator, where the gap in meters is the widest
function createGeneralizeLevels() {
  return GENERALIZE_ZOOMS.map((zoom) => {
    const cellSize = (GENERALIZE_PIXELS * METERS_PER_PIXEL_Z0) / 2 ** zoom

    return {
      zoom,
      cellSize,
      grid: createTrace(cellSize),
      // Thousands of points per cell at zoom 7 otherwise
      every: Math.max(1, Math.floor(cellSize / 4 / STEP_METERS)),
    }
  })
}

function getMatchingRuns(ranges, cumulative, test) {
  const runs = []

  ranges.forEach(([start, end]) => {
    let runStart = -1

    for (let i = start; i <= end + 1; i++) {
      if (i <= end && test(i)) {
        if (runStart === -1) runStart = i
        continue
      }

      if (runStart !== -1) {
        runs.push({
          start: runStart,
          end: i - 1,
          length: cumulative[i - 1] - cumulative[runStart],
          isInner: runStart > start && i - 1 < end,
        })
      }
      runStart = -1
    }
  })

  return runs
}

// `hides[i]`: the zoom under which point `i` is hidden. A point hidden at a
// zoom stays hidden below it.
function generalize(points, cumulative, ranges, levels, hides) {
  const cosLatitude = Math.cos((points[ranges[0][0]].coord[1] * Math.PI) / 180)

  levels.forEach(({zoom, cellSize, grid, every}) => {
    const radius =
      (GENERALIZE_PIXELS * METERS_PER_PIXEL_Z0 * cosLatitude) / 2 ** zoom
    const self = createTrace(cellSize)
    const behind = []
    const near = new Uint8Array(points.length)

    ranges.forEach(([start, end]) => {
      for (let i = start; i <= end; i += every) {
        if (hides[i]) continue

        while (
          behind.length > 0 &&
          cumulative[i] - cumulative[behind[0]] >
            GENERALIZE_SELF_GAP_FACTOR * radius
        ) {
          self.add(points[behind.shift()])
        }

        const isNear =
          grid.isNear(points[i], radius) || self.isNear(points[i], radius)

        for (let j = i; j < Math.min(i + every, end + 1); j++) near[j] = isNear
        if (!isNear) behind.push(i)
      }
    })

    getMatchingRuns(ranges, cumulative, (i) => !hides[i] && near[i])
      .filter((run) => run.length >= GENERALIZE_MIN_RUN_FACTOR * radius)
      .forEach(({start, end}) => {
        for (let i = start; i <= end; i++) hides[i] = zoom + 1
      })

    getMatchingRuns(ranges, cumulative, (i) => !hides[i])
      .filter(
        (run) =>
          run.isInner && run.length < GENERALIZE_MIN_VISIBLE_FACTOR * radius
      )
      .forEach(({start, end}) => {
        for (let i = start; i <= end; i++) hides[i] = zoom + 1
      })

    ranges.forEach(([start, end]) => {
      for (let i = start; i <= end; i += every) {
        if (!hides[i]) grid.add(points[i])
      }
    })
  })
}

// Neighbouring pieces share their junction point, so the track stays continuous
function splitRange(
  coordinates,
  points,
  [start, end],
  dashes,
  hides,
  parts,
  stubs
) {
  const sameAs = (i, j) => dashes[i] === dashes[j] && hides[i] === hides[j]
  let runStart = start

  for (let i = start + 1; i <= end; i++) {
    if (i < end && sameAs(i, runStart)) continue

    const line = sliceTrack(coordinates, points, runStart, i)
    const dashUntil = dashes[runStart]
    const hideUntil = hides[runStart]

    if (dashUntil === 0 && hideUntil === 0) parts.push(line)
    else stubs.push({dashUntil, hideUntil, coordinates: line})

    runStart = i
  }
}

// Binary heap
function createQueue(compare) {
  const items = []

  const swap = (i, j) => ([items[i], items[j]] = [items[j], items[i]])

  return {
    get size() {
      return items.length
    },
    peek: () => items[0],
    push(item) {
      items.push(item)
      let i = items.length - 1
      while (i > 0) {
        const parent = (i - 1) >> 1
        if (compare(items[i], items[parent]) >= 0) break
        swap(i, parent)
        i = parent
      }
    },
    pop() {
      const top = items[0]
      const last = items.pop()
      if (items.length > 0) {
        items[0] = last
        let i = 0
        for (;;) {
          const left = 2 * i + 1
          const right = left + 1
          let smallest = i
          if (left < items.length && compare(items[left], items[smallest]) < 0)
            smallest = left
          if (
            right < items.length &&
            compare(items[right], items[smallest]) < 0
          )
            smallest = right
          if (smallest === i) break
          swap(i, smallest)
          i = smallest
        }
      }
      return top
    },
  }
}

// An activity never depends on later ones, so a month's map never changes
function selectChronologically(candidates) {
  const coveredTiles = new Set()

  return [...candidates]
    .sort((a, b) => byStartDate(a.activity, b.activity))
    .map(({activity, tiles}) => {
      const newTiles = new Set(tiles.filter((tile) => !coveredTiles.has(tile)))

      tiles.forEach((tile) => coveredTiles.add(tile))

      return {activity, tiles, newTiles}
    })
}

// Greedy set cover: the activity bringing the most uncovered tiles first
function selectByCoverage(candidates) {
  const queue = createQueue(
    (a, b) => b.gain - a.gain || byStartDate(b.activity, a.activity)
  )
  const coveredTiles = new Set()
  const selected = []

  candidates.forEach((candidate) =>
    queue.push({...candidate, gain: candidate.tiles.length})
  )

  // Lazy: a gain only goes down, so an updated gain still on top is the best
  while (queue.size > 0) {
    const candidate = queue.pop()
    const newTiles = candidate.tiles.filter((tile) => !coveredTiles.has(tile))

    if (
      newTiles.length > 0 &&
      queue.size > 0 &&
      queue.peek().gain > newTiles.length
    ) {
      candidate.gain = newTiles.length
      queue.push(candidate)
      continue
    }

    newTiles.forEach((tile) => coveredTiles.add(tile))
    selected.push({
      activity: candidate.activity,
      tiles: candidate.tiles,
      newTiles: new Set(newTiles),
    })
  }

  return selected
}

// Trimming the ends against later tracks would make a month depend on the
// next ones, so `chronological` doesn't
const ORDERS = {
  chronological: {select: selectChronologically, trimEnds: false},
  coverage: {select: selectByCoverage, trimEnds: true},
}

// A piece bringing no new tile is left out, its road stays free for later
function cutTrack(points, trace, newTiles) {
  const covered = points.map((point) => trace.isNear(point))

  return getKeptRanges(points, covered)
    .map((range) => clearRange(points, trace, range))
    .filter(
      (range) =>
        range &&
        pointsToTiles(
          points.slice(range[0], range[1] + 1).map(({coord}) => coord)
        ).some(({x, y}) => newTiles.has(`${x}-${y}`))
    )
}

function trimEnds({activity, points, ranges}, trace) {
  const isFree = (i) => !trace.isNear(points[i], NEAR_METERS, activity.id)
  const first = ranges[0]
  const last = ranges[ranges.length - 1]

  if (first[0] === 0) {
    while (first[0] < first[1] && !isFree(first[0])) first[0]++
  }
  if (last[1] === points.length - 1) {
    while (last[1] > last[0] && !isFree(last[1])) last[1]--
  }

  return ranges.filter(([start, end]) => start < end)
}

// Selects the activities by `order`, cuts what they share with the tracks
// drawn before them, then generalizes by zoom. See docs/declutter.md.
function declutter(activities, {order = "chronological"} = {}) {
  if (!ORDERS[order]) {
    throw new Error(
      `Unknown declutter order "${order}", expected one of: ${Object.keys(
        ORDERS
      ).join(", ")}`
    )
  }

  const {select, trimEnds: shouldTrimEnds} = ORDERS[order]
  const candidates = activities
    .filter(
      (activity) => activity.coordinates && activity.coordinates.length > 1
    )
    .map((activity) => ({
      activity,
      tiles: pointsToTiles(activity.coordinates).map(({x, y}) => `${x}-${y}`),
    }))

  const results = new Map()
  const trace = createTrace()
  const kept = []

  const hide = ({activity, tiles, newTiles}, reason) =>
    results.set(activity.id, {
      hidden: true,
      reason,
      tiles: tiles.length,
      newTiles: newTiles.size,
      parts: null,
      stubs: null,
    })

  select(candidates).forEach((selected) => {
    if (selected.newTiles.size === 0) return hide(selected, "no-new-tiles")

    const points = densify(selected.activity.coordinates)
    const ranges = cutTrack(points, trace, selected.newTiles)

    if (ranges.length === 0) return hide(selected, "already-traced")

    ranges.forEach(([start, end]) => {
      for (let i = start; i <= end; i++) {
        trace.add({...points[i], owner: selected.activity.id})
      }
    })

    kept.push({...selected, points, ranges})
  })

  const levels = createGeneralizeLevels()

  kept.forEach((track) => {
    const {activity, tiles, newTiles, points} = track
    const ranges = shouldTrimEnds ? trimEnds(track, trace) : track.ranges

    if (ranges.length === 0) return hide(track, "already-traced")

    const cumulative = getCumulativeDistances(points)
    const dashes = new Uint8Array(points.length)
    const hides = new Uint8Array(points.length)
    const parts = []
    const stubs = []

    ranges.forEach((range) => getBandDashes(points, cumulative, range, dashes))
    generalize(points, cumulative, ranges, levels, hides)
    ranges.forEach((range) =>
      splitRange(
        activity.coordinates,
        points,
        range,
        dashes,
        hides,
        parts,
        stubs
      )
    )

    results.set(activity.id, {
      hidden: false,
      reason: null,
      tiles: tiles.length,
      newTiles: newTiles.size,
      parts,
      stubs,
    })
  })

  return results
}

module.exports = {declutter, simplify, DECLUTTER_ORDERS: Object.keys(ORDERS)}
