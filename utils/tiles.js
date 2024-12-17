const {lngToX, latToY, xToLng, yToLat, Z} = require("./map")
const {rangeArray} = require("./utils")

function areTilesSame(tile1, tile2) {
  return tile1.x === tile2.x && tile1.y === tile2.y
}

function uniqueTiles(tile, index, tiles) {
  return tiles.findIndex((tile2) => areTilesSame(tile, tile2)) === index
}

function distinctTiles(tiles) {
  return (tile) => !tiles.find((tile2) => areTilesSame(tile, tile2))
}

function tileToCoords({x, y}) {
  const topLat = yToLat(y, Z)
  const topLng = xToLng(x, Z)
  const bottomLat = yToLat(y + 1, Z)
  const bottomLng = xToLng(x + 1, Z)

  return [
    [bottomLng, bottomLat],
    [bottomLng, topLat],
    [topLng, topLat],
    [topLng, bottomLat],
    [bottomLng, bottomLat],
  ]
}

function pointsToTiles(points) {
  return points
    .map(([lat, lng]) => {
      const x = lngToX(lng)
      const y = latToY(lat)
      return {
        x,
        y,
        coords: tileToCoords({x, y}),
      }
    })
    .filter(uniqueTiles)
}

function getTilesFromSquare(square) {
  const tiles = []

  for (let x = square.x; x < square.x + square.size; x++) {
    for (let y = square.y; y < square.y + square.size; y++) {
      tiles.push({x, y, coords: tileToCoords({x, y})})
    }
  }

  return tiles
}

function getSquareTiles(tiles) {
  const tilesSet = new Set(tiles.map((tile) => `${tile.x}-${tile.y}`))
  let maxSquare = {size: 0}

  tiles.forEach((tile) => {
    let isSquare = true
    let tileMaxSquareSize = 1

    while (isSquare) {
      const xArray = rangeArray(tile.x, tile.x + tileMaxSquareSize)
      const yArray = rangeArray(tile.y, tile.y + tileMaxSquareSize)

      isSquare = xArray.every((x) =>
        yArray.every((y) => tilesSet.has(`${x}-${y}`))
      )

      if (isSquare) {
        tileMaxSquareSize++

        if (tileMaxSquareSize > maxSquare.size) {
          maxSquare = {x: tile.x, y: tile.y, size: tileMaxSquareSize}
        }
      }
    }
  })

  return getTilesFromSquare(maxSquare)
}

module.exports = {
  getSquareTiles,
  uniqueTiles,
  distinctTiles,
  pointsToTiles,
}
