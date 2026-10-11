const {getActivityTiles} = require("./utils/activity.js")
const {getAthleteTiles} = require("./utils/athlete.js")
const {declutter, DECLUTTER_ORDERS} = require("./utils/declutter.js")

exports.pluginOptionsSchema = ({Joi}) =>
  Joi.object({
    declutter: Joi.object({
      order: Joi.string().valid(...DECLUTTER_ORDERS),
      filter: Joi.function(),
    }),
  })

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

    type Declutter implements Node @dontInfer {
      hidden: Boolean!
      reason: String
      tiles: Int
      newTiles: Int
      parts: [[[Float!]!]!]
      stubs: [DeclutterStub!]
    }

    # Hidden under \`hideUntil\`, dashed under \`dashUntil\`
    type DeclutterStub {
      dashUntil: Int!
      hideUntil: Int!
      coordinates: [[Float!]!]!
    }
  `)
}

const declutterNodeId = (activityId) => `declutter-${activityId}`

// Not `createTypes`: these types belong to gatsby-source-strava, and
// redefining them logs a conflict warning. `fields.tiles` is what
// `createNodeField` persists, `source.tiles` can be `null`. `nodeModel`
// makes the page query depend on the `Declutter` node.
exports.createResolvers = ({createResolvers}) => {
  createResolvers({
    StravaActivity: {
      tiles: {
        type: "[Tile]",
        resolve: (source) => source.fields.tiles,
      },
      declutter: {
        type: "Declutter",
        resolve: (source, args, context) =>
          context.nodeModel.getNodeById({
            id: declutterNodeId(source.id),
            type: "Declutter",
          }),
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

const activityNodesById = new Map()
let athleteNode = null
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
}

// Gatsby clears this cache when the plugin's version changes
async function getDeclutterResults(
  activities,
  order,
  {cache, createContentDigest, reporter}
) {
  const digest = createContentDigest([
    order,
    activities.map((node) => [
      node.id,
      node.start_date,
      node.coordinates.length,
      node.coordinates[0],
      node.coordinates[node.coordinates.length - 1],
    ]),
  ])
  const cached = await cache.get("declutter")

  if (cached && cached.digest === digest) return new Map(cached.results)

  const timer = reporter.activityTimer("strava-tiles: declutter the activities")

  timer.start()
  const results = declutter(activities, {order})
  timer.end()

  await cache.set("declutter", {digest, results: [...results]})

  return results
}

// Nodes rather than `createNodeField`, whose changes don't rerun the queries.
// Stateful nodes, so the obsolete ones are deleted here.
async function updateDeclutter(args, declutterOptions) {
  const {
    actions: {createNode, deleteNode},
    createContentDigest,
    getNodesByType,
    reporter,
  } = args
  let results = new Map()

  if (declutterOptions) {
    const {order = "chronological", filter = () => true} = declutterOptions
    // Sorted, so the cache digest doesn't depend on the sourcing order
    const activities = [...activityNodesById.values()]
      .filter((node) => node.coordinates.length > 1 && filter(node))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

    results = await getDeclutterResults(activities, order, args)
  }

  const nodeIds = new Set()

  results.forEach((value, activityId) => {
    const id = declutterNodeId(activityId)

    nodeIds.add(id)
    createNode({
      ...value,
      id,
      internal: {type: "Declutter", contentDigest: createContentDigest(value)},
    })
  })

  getNodesByType("Declutter")
    .filter((node) => !nodeIds.has(node.id))
    .forEach((node) => deleteNode(node))

  if (declutterOptions) {
    const hidden = [...results.values()].filter((result) => result.hidden)
    reporter.success(
      `strava-tiles: declutter, ${results.size - hidden.length} activities ` +
        `shown, ${hidden.length} hidden`
    )
  }
}

// Created after sourcing, the `Declutter` nodes would otherwise be deleted as
// stale at each start. Gatsby 5.12+.
exports.onPluginInit = ({actions}) => {
  if (actions.enableStatefulSourceNodes) actions.enableStatefulSourceNodes()
}

exports.onCreateNode = async (args, {declutter: declutterOptions}) => {
  const {
    node,
    actions: {createNodeField},
  } = args

  if (node.internal.type === "StravaActivity") {
    createNodeField({node, name: "tiles", value: []})

    if (node.coordinates && node.coordinates.length > 0) {
      activityNodesById.set(node.id, node)

      // A dev-mode refetch, after `onPostBootstrap`
      if (hasSourced) {
        recomputeTiles({createNodeField})
        await updateDeclutter(args, declutterOptions)
      }
    }
  }

  if (node.internal.type === "StravaAthlete") {
    athleteNode = node
  }
}

// Runs once every plugin has sourced its nodes, before queries. Not
// `sourceNodes`: exporting it without calling `createNode`, as when the
// declutter is disabled, triggers Gatsby's "has generated no Gatsby nodes"
// warning.
exports.onPostBootstrap = async (args, {declutter: declutterOptions}) => {
  const {
    actions: {createNodeField},
    getNodesByType,
    reporter,
  } = args

  try {
    // With Gatsby's cache kept, `onCreateNode` only sees new or changed nodes
    getNodesByType("StravaActivity").forEach((node) => {
      if (node.coordinates && node.coordinates.length > 0) {
        activityNodesById.set(node.id, node)
      }
    })

    const [athlete] = getNodesByType("StravaAthlete")
    if (athlete) athleteNode = athlete

    recomputeTiles({createNodeField})
    hasSourced = true
    reporter.success("strava-tiles: tiles computed")

    await updateDeclutter(args, declutterOptions)
  } catch (e) {
    // Only fatal for `gatsby build`, not `gatsby develop`
    reporter.panicOnBuild(`strava-tiles: ${e.message}`, e)
  }
}
