const {getSquare, getCluster, getMonthly, distinctTiles} = require("./tiles.js")

function getAthleteTiles(tiles, tilesByMonth) {
  const square = getSquare(tiles)
  const cluster = getCluster(tiles)
  const monthly = getMonthly(tilesByMonth)

  const athleteTiles = {
    all: tiles,
    square: square.tiles,
    cluster,
    parts: {
      squareBorder: square.border,
      squareSize: square.size,
      square: square.tiles,
      cluster: cluster.filter(distinctTiles(square.tiles)),
      rest: tiles.filter(distinctTiles([...square.tiles, ...cluster])),
    },
    monthly,
  }

  return athleteTiles
}

module.exports = {
  getAthleteTiles,
}
