const {getActivityTiles} = require("./utils/activity.js")
const {getAthleteTiles} = require("./utils/athlete.js")

// `createNodeField` alone lets Gatsby infer the type, which only works once
// it has seen a non-empty example -- a sparse fetch (a narrow date range, or
// no activities with coordinates yet) leaves `tiles` empty on every node and
// the field silently drops from the schema. Declaring it here keeps it typed
// regardless of how much data was actually sourced.
exports.createSchemaCustomization = ({actions: {createTypes}}) => {
  createTypes(`
    type Tile {
      x: Int
      y: Int
    }

    # squareBorder only sets \`size\`; rowBorder/columnBorder only set
    # \`width\`/\`height\` -- one shared shape, unused fields come back null
    type TileBorder {
      x: Int
      y: Int
      size: Int
      width: Int
      height: Int
    }

    type TileOutlines {
      square: [[[[Float]]]]
      cluster: [[[[Float]]]]
      rest: [[[[Float]]]]
    }

    type MonthlyTileOutlines {
      square: [[[[Float]]]]
      cluster: [[[[Float]]]]
      rest: [[[[Float]]]]
      new: [[[[Float]]]]
    }

    type TileParts {
      squareBorder: TileBorder
      squareSize: Int
      square: [Tile]
      rowBorder: TileBorder
      rowSize: Int
      row: [Tile]
      columnBorder: TileBorder
      columnSize: Int
      column: [Tile]
      cluster: [Tile]
      rest: [Tile]
      outlines: TileOutlines
    }

    type MonthlyTileParts {
      squareBorder: TileBorder
      squareSize: Int
      square: [Tile]
      rowBorder: TileBorder
      rowSize: Int
      row: [Tile]
      columnBorder: TileBorder
      columnSize: Int
      column: [Tile]
      cluster: [Tile]
      rest: [Tile]
      new: [Tile]
      outlines: MonthlyTileOutlines
    }

    type MonthlyTiles {
      yearMonth: String
      year: String
      month: String
      parts: MonthlyTileParts
    }

    type AthleteTiles {
      parts: TileParts
      monthly: [MonthlyTiles]
    }
  `)
}

// StravaActivity/StravaAthlete already exist -- created, and owned, by
// gatsby-source-strava. Adding `tiles` to them through `createTypes` above
// would make Gatsby treat this plugin as redefining a type it doesn't own,
// which logs a "could potentially cause conflicts" warning even though nothing
// actually conflicts. `createResolvers` adds a field to an existing type
// without that ownership check, so it doesn't warn.
//
// The resolver reads `source.fields.tiles`, not `source.tiles`: that's what
// `createNodeField` actually persists. Reading `source.tiles` directly only
// happens to work for StravaActivity because `recomputeTiles` mutates the
// still-live node reference before persisting; for StravaAthlete that
// mutation lands too late and it would resolve to `null`, crashing any query
// that destructures into it.
exports.createResolvers = ({createResolvers}) => {
  createResolvers({
    StravaActivity: {
      tiles: {
        type: "[Tile]",
        resolve: (source) => source.fields.tiles,
      },
    },
    StravaAthlete: {
      tiles: {
        type: "AthleteTiles",
        resolve: (source) => source.fields.tiles,
      },
    },
  })
}

// Raw node references, captured in `onCreateNode`, so `recomputeTiles` can
// read their `coordinates`/`streams`/`start_date` directly later
const activityNodesById = new Map()
let athleteNode = null
let hasSourced = false

// Which tiles an activity was the first to cover only means anything walked in
// chronological order, and `gatsby-source-strava` creates nodes in whatever
// order Strava returned them -- hence the sort, on every recompute.
function recomputeTiles({createNodeField}) {
  const sortedActivityNodes = [...activityNodesById.values()].sort((a, b) =>
    a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0
  )

  let tiles = []
  const tilesByMonth = {}

  sortedActivityNodes.forEach((node) => {
    const newTiles = getActivityTiles(node, tiles)

    createNodeField({node, name: "tiles", value: newTiles})

    const yearMonth = node.start_date.substring(0, 7)

    if (!tilesByMonth[yearMonth]) {
      tilesByMonth[yearMonth] = {old: [...tiles], new: []}
    }
    tilesByMonth[yearMonth].new.push(...newTiles)

    tiles.push(...newTiles)
  })

  if (athleteNode) {
    const athleteTiles = getAthleteTiles(tiles, tilesByMonth)

    createNodeField({node: athleteNode, name: "tiles", value: athleteTiles})
  }
}

exports.onCreateNode = ({node, actions: {createNodeField}}) => {
  if (node.internal.type === "StravaActivity") {
    // The schema resolves `tiles` from this field (see `createResolvers`
    // above), so this is what the query actually reads
    createNodeField({node, name: "tiles", value: []})

    if (node.coordinates && node.coordinates.length > 0) {
      activityNodesById.set(node.id, node)

      // Before that, `onPostBootstrap` folds the whole import in one go;
      // after, this is a dev-mode refetch of one activity, recomputed on its
      // own
      if (hasSourced) {
        recomputeTiles({createNodeField})
      }
    }
  }

  if (node.internal.type === "StravaAthlete") {
    athleteNode = node
  }
}

// `sourceNodes` would also work -- Gatsby finishes one plugin's `sourceNodes`
// before starting the next, so every node gatsby-source-strava creates would
// already exist there too -- but exporting it marks this plugin as a
// "can generate nodes" one, and it never calls `createNode`, only
// `createNodeField` on nodes another plugin owns. That mismatch is exactly
// what triggers Gatsby's "has generated no Gatsby nodes" warning.
// `onPostBootstrap` runs once, after every plugin's `sourceNodes` has
// finished (regardless of plugin order in `gatsby-config.js`) and before
// queries are run, so it does the same job without tripping that check.
exports.onPostBootstrap = ({actions: {createNodeField}, reporter}) => {
  try {
    recomputeTiles({createNodeField})
    hasSourced = true

    reporter.success("strava-tiles: tiles computed")
  } catch (e) {
    // `panicOnBuild`, not `panic`: it only kills the process for `gatsby
    // build`, so a bad activity doesn't take down `gatsby develop` on every
    // reload
    reporter.panicOnBuild(`strava-tiles: ${e.message}`, e)
  }
}
