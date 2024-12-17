const {pointsToTiles} = require("./tiles")
const {polylineToPoints} = require("./map")

function getActivityTiles(activity) {
  const latlngStream = activity.streams && activity.streams.latlng
  const polyline = activity.map && activity.map.summary_polyline

  return {
    points: latlngStream || polylineToPoints(polyline),
    tiles: pointsToTiles(latlngStream || polylineToPoints(polyline, true)),
  }
}

module.exports = {
  getActivityTiles,
}
