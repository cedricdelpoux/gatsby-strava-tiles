const {distinctTiles, pointsToTiles} = require("./tiles")

function getActivityTiles(activity, allTiles) {
  // Only the raw stream samples often enough for a gap to mean a GPS pause:
  // `polyline` is simplified for display, where two far-apart points are just
  // a long straight stretch.
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
