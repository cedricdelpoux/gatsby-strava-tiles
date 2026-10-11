const {pointsToTiles} = require("./tiles")

// No stream for a route, so no gap to read as a GPS pause
function getRouteTiles(route, isNewTile) {
  const all = route.coordinates ? pointsToTiles(route.coordinates) : []

  return {all, new: all.filter(isNewTile)}
}

module.exports = {
  getRouteTiles,
}
