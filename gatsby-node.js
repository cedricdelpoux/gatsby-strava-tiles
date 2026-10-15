const {getActivityTiles} = require("./utils/activity.js")
const {getAthleteTiles} = require("./utils/athlete.js")
const {getRouteTiles} = require("./utils/route.js")
const {distinctTiles} = require("./utils/tiles.js")

exports.pluginOptionsSchema = ({Joi}) => Joi.object({})

// Declared explicitly: an inferred type drops from the schema when every
// sourced `tiles` is empty
exports.createSchemaCustomization = ({actions: {createTypes}}) => {
  createTypes(`
    type Tile {
      x: Int
      y: Int
    }

    # squareBorder sets \`size\`, rowBorder/columnBorder set \`width\`/\`height\`
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

    # \`new\`: not covered by any activity yet
    type RouteTiles {
      all: [Tile]
      new: [Tile]
    }
  `)
}

// A new activity changes the new tiles of a route, but `createNodeField`
// alone doesn't rerun the queries
const dependOnEveryActivity = (context) =>
  context.nodeModel.findAll({type: "StravaActivity", query: {limit: 1}})

// Not `createTypes`: these types belong to gatsby-source-strava, and
// redefining them logs a conflict warning. `fields.tiles` is what
// `createNodeField` persists, `source.tiles` can be `null`.
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
    StravaRoute: {
      tiles: {
        type: "RouteTiles",
        resolve: async (source, args, context) => {
          await dependOnEveryActivity(context)

          return source.fields.tiles
        },
      },
    },
  })
}

const activityNodesById = new Map()
const routeNodesById = new Map()
let athleteNode = null
let isNewTile = () => true
let hasSourced = false

// New tiles only make sense in chronological order, which Strava doesn't
// guarantee
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

  isNewTile = distinctTiles(tiles)
  routeNodesById.forEach((node) => updateRouteTiles(node, {createNodeField}))
}

function updateRouteTiles(node, {createNodeField}) {
  createNodeField({
    node,
    name: "tiles",
    value: getRouteTiles(node, isNewTile),
  })
}

exports.onCreateNode = ({node, actions: {createNodeField}}) => {
  if (node.internal.type === "StravaActivity") {
    createNodeField({node, name: "tiles", value: []})

    if (node.coordinates && node.coordinates.length > 0) {
      activityNodesById.set(node.id, node)

      // A dev-mode refetch, after `createPages`
      if (hasSourced) recomputeTiles({createNodeField})
    }
  }

  if (node.internal.type === "StravaRoute") {
    routeNodesById.set(node.id, node)

    if (hasSourced) {
      updateRouteTiles(node, {createNodeField})
    } else {
      createNodeField({node, name: "tiles", value: {all: [], new: []}})
    }
  }

  if (node.internal.type === "StravaAthlete") {
    athleteNode = node
  }
}

// Before the site's `createPages`, which Gatsby runs last. Not `sourceNodes`,
// which warns "has generated no Gatsby nodes".
exports.createPages = ({
  actions: {createNodeField},
  getNodesByType,
  reporter,
}) => {
  try {
    // With Gatsby's cache kept, `onCreateNode` only sees new or changed nodes
    getNodesByType("StravaActivity").forEach((node) => {
      if (node.coordinates && node.coordinates.length > 0) {
        activityNodesById.set(node.id, node)
      }
    })

    getNodesByType("StravaRoute").forEach((node) => {
      routeNodesById.set(node.id, node)
    })

    const [athlete] = getNodesByType("StravaAthlete")
    if (athlete) athleteNode = athlete

    recomputeTiles({createNodeField})
    hasSourced = true
    reporter.success("strava-tiles: tiles computed")
  } catch (e) {
    // Only fatal for `gatsby build`, not `gatsby develop`
    reporter.panicOnBuild(`strava-tiles: ${e.message}`, e)
  }
}
