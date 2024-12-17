const {getActivityTiles} = require("./utils/activity.js")
const {getAthleteTiles} = require("./utils/athlete.js")
const {distinctTiles} = require("./utils/tiles.js")

let globalTiles = []
let globalTilesByMonth = {}

exports.onCreateNode = ({node, actions: {createNodeField}}) => {
  if (
    node.internal.type === "StravaActivity" &&
    node.map &&
    node.map.summary_polyline.length > 0
  ) {
    const {points, tiles} = getActivityTiles(node)
    const newTiles = tiles.filter(distinctTiles(globalTiles))
    const yearMonth = node.start_date.substring(0, 7)

    if (!globalTilesByMonth[yearMonth]) globalTilesByMonth[yearMonth] = []

    globalTilesByMonth[yearMonth].push(...newTiles)
    globalTiles.push(...newTiles)

    node.map.points = points
    node.map.tiles = tiles
    node.map.newTiles = newTiles

    createNodeField({node, name: "points", value: points})
    createNodeField({node, name: "tiles", value: tiles})
    createNodeField({node, name: "newTiles", value: newTiles})
  }

  if (node.internal.type === "StravaAthlete") {
    const {square, tiles, tilesByMonth} = getAthleteTiles(
      node,
      globalTiles,
      globalTilesByMonth
    )

    node.map = {
      square,
      tiles,
      tilesByMonth,
    }

    createNodeField({node, name: "square", value: square})
    createNodeField({node, name: "tiles", value: tiles})
    createNodeField({node, name: "tilesByMonth", value: tilesByMonth})
  }
}
