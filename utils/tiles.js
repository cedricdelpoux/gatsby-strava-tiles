const {demultiplyPoints, lngToX, latToY, xToLng, yToLat, Z} = require("./map")
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

function tileToCoords({x, y, size = 1}) {
  const topLng = xToLng(x, Z)
  const topLat = yToLat(y, Z)
  const bottomLng = xToLng(x + size, Z)
  const bottomLat = yToLat(y + size, Z)

  return [
    [bottomLng, bottomLat],
    [bottomLng, topLat],
    [topLng, topLat],
    [topLng, bottomLat],
    [bottomLng, bottomLat],
  ]
}

function pointsToTiles(points, demultiply) {
  const coordinates = demultiply ? demultiplyPoints(points) : points
  return coordinates
    .map(([lng, lat]) => {
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

function getSquareTiles(square) {
  const tiles = []

  for (let x = square.x; x < square.x + square.size; x++) {
    for (let y = square.y; y < square.y + square.size; y++) {
      tiles.push({x, y, coords: tileToCoords({x, y})})
    }
  }

  return tiles.filter(uniqueTiles)
}

function getSquareBorder(square) {
  const x = square.x
  const y = square.y
  const x2 = square.x + square.size
  const y2 = square.y + square.size
  return {
    x,
    y,
    x2,
    y2,
    coords: tileToCoords({x, y, size: square.size}),
  }
}

function getSquare(tiles) {
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

  return {
    size: maxSquare.size,
    tiles: getSquareTiles(maxSquare),
    border: getSquareBorder(maxSquare),
  }
}

function getCluster(tiles) {
  const tilesSet = new Set(tiles.map((tile) => `${tile.x}-${tile.y}`))
  const cluster = []

  tiles.forEach(({x, y, coords}) => {
    if (
      tilesSet.has(`${x - 1}-${y}`) &&
      tilesSet.has(`${x + 1}-${y}`) &&
      tilesSet.has(`${x}-${y - 1}`) &&
      tilesSet.has(`${x}-${y + 1}`)
    ) {
      cluster.push({x, y, coords})
    }
  })

  return cluster
}

function getMonthly(tilesByMonth) {
  return Object.keys(tilesByMonth).reduce((acc, yearMonth) => {
    const tiles = tilesByMonth[yearMonth]
    const oldTiles = tiles.old
    const newTiles = tiles.new
    const allTiles = [...oldTiles, ...newTiles]
    const square = getSquare(allTiles)
    const cluster = getCluster(allTiles)
    acc.push({
      yearMonth,
      year: yearMonth.substring(0, 4),
      month: yearMonth.substring(5, 7),
      tiles: {
        all: allTiles,
        new: newTiles,
        old: oldTiles,
        parts: {
          squareBorder: square.border,
          squareSize: square.size,
          square: square.tiles,
          cluster: allTiles.filter(distinctTiles(square.tiles)),
          rest: allTiles.filter(distinctTiles([...square.tiles, ...cluster])),
          old: oldTiles.filter(distinctTiles(square.tiles)),
          new: newTiles.filter(distinctTiles(square.tiles)),
        },
      },
    })

    return acc
  }, [])
}

module.exports = {
  getCluster,
  getSquare,
  getMonthly,
  uniqueTiles,
  distinctTiles,
  pointsToTiles,
}
