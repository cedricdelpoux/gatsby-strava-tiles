const {distinctTiles, pointsToTiles} = require("./tiles")

function getActivityTiles(activity, allTiles) {
  const hasPreciseData = activity.streams && activity.streams.latlng
  const mustDemultiply = !hasPreciseData
  const tiles = pointsToTiles(activity.coordinates, mustDemultiply)

  return {
    all: tiles,
    parts: {
      old: [...allTiles],
      new: tiles.filter(distinctTiles(allTiles)),
    },
  }
}

module.exports = {
  getActivityTiles,
}
