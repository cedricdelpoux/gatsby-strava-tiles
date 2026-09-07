const {getActivityTiles} = require("./utils/activity.js")
const {getAthleteTiles} = require("./utils/athlete.js")

// Raw node references, captured in `onCreateNode`, so `recomputeTiles` can
// mutate them directly later
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

    node.tiles = newTiles
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

    athleteNode.tiles = athleteTiles
    createNodeField({node: athleteNode, name: "tiles", value: athleteTiles})
  }
}

exports.onCreateNode = ({node, actions: {createNodeField}}) => {
  if (node.internal.type === "StravaActivity") {
    node.tiles = []

    // The mutation above is what the query reads, but a field only survives a
    // later schema rebuild when it was registered through this action too
    createNodeField({node, name: "tiles", value: node.tiles})

    if (node.coordinates && node.coordinates.length > 0) {
      activityNodesById.set(node.id, node)

      // Before that, `sourceNodes` folds the whole import in one go; after,
      // this is a dev-mode refetch of one activity, recomputed on its own
      if (hasSourced) {
        recomputeTiles({createNodeField})
      }
    }
  }

  if (node.internal.type === "StravaAthlete") {
    athleteNode = node
  }
}

// Gatsby finishes one plugin's `sourceNodes` before starting the next, so
// every node gatsby-source-strava creates already exists here
exports.sourceNodes = ({actions: {createNodeField}}) => {
  recomputeTiles({createNodeField})
  hasSourced = true
}
