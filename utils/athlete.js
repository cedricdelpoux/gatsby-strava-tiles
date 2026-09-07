const {
  getSquare,
  getMaxRow,
  getMaxColumn,
  getCluster,
  getMonthly,
  distinctTiles,
  tilesToOutline,
} = require("./tiles.js")

function getAthleteTiles(tiles, tilesByMonth) {
  const square = getSquare(tiles)
  const row = getMaxRow(tiles)
  const column = getMaxColumn(tiles)
  const cluster = getCluster(tiles)
  const monthly = getMonthly(tilesByMonth)

  const clusterTiles = cluster.filter(distinctTiles(square.tiles))
  const restTiles = tiles.filter(distinctTiles([...square.tiles, ...cluster]))

  const athleteTiles = {
    parts: {
      squareBorder: square.border,
      squareSize: square.size,
      square: square.tiles,
      // The row and the column cross the three parts below rather than being
      // one of them: they are drawn over the split, not instead of it
      rowBorder: row.border,
      rowSize: row.size,
      row: row.tiles,
      columnBorder: column.border,
      columnSize: column.size,
      column: column.tiles,
      cluster: clusterTiles,
      rest: restTiles,
      outlines: {
        square: tilesToOutline(square.tiles),
        cluster: tilesToOutline(clusterTiles),
        rest: tilesToOutline(restTiles),
      },
    },
    monthly,
  }

  return athleteTiles
}

module.exports = {
  getAthleteTiles,
}
