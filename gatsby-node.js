const {getActivityTiles} = require("./utils/activity.js")
const {getAthleteTiles} = require("./utils/athlete.js")

let tiles = []
let tilesByMonth = {}

exports.onCreateNode = ({node, actions: {createNodeField}}) => {
  // Activity
  if (node.internal.type === "StravaActivity" && node.coordinates.length > 0) {
    const activityTiles = getActivityTiles(node, tiles)
    const newTiles = activityTiles.parts.new

    node.tiles = activityTiles
    createNodeField({node, name: "tiles", value: activityTiles})

    const yearMonth = node.start_date.substring(0, 7)

    if (!tilesByMonth[yearMonth]) {
      tilesByMonth[yearMonth] = activityTiles.parts
    } else {
      tilesByMonth[yearMonth].new.push(...newTiles)
    }

    tiles.push(...newTiles)
  }

  // Athlete
  if (node.internal.type === "StravaAthlete") {
    const athleteTiles = getAthleteTiles(tiles, tilesByMonth)

    node.tiles = athleteTiles
    createNodeField({node, name: "tiles", value: athleteTiles})
  }
}
