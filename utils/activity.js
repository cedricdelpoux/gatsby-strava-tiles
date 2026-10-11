const {distinctTiles, pointsToTiles} = require("./tiles")

function getActivityTiles(activity, allTiles) {
  // Only raw streams are dense enough for a gap to mean a GPS pause
  const hasRawLatlngStream = Boolean(
    activity.streams && activity.streams.latlng
  )
  const tiles = pointsToTiles(activity.coordinates, {
    detectGaps: hasRawLatlngStream,
  })

  return tiles.filter(distinctTiles(allTiles))
}

module.exports = {
  getActivityTiles,
}
