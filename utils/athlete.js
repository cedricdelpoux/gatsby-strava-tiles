const {getSquareTiles, distinctTiles, uniqueTiles} = require("./tiles")

function getAthleteTiles(athlete, globalTiles, globalTilesByMonth) {
  const athleteSquare = getSquareTiles(globalTiles)
  console.log("athleteSquare", athleteSquare.length)
  const athleteTiles = globalTiles.filter(distinctTiles(athleteSquare))
  const athleteTilesByMonth = Object.keys(globalTilesByMonth).reduce(
    (acc, yearMonth) => {
      const monthTiles = globalTilesByMonth[yearMonth].filter(uniqueTiles)
      const monthSquare = getSquareTiles(monthTiles)
      acc.push({
        year: yearMonth.substring(0, 4),
        month: yearMonth.substring(5, 7),
        square: monthSquare,
        tiles: monthTiles.filter(distinctTiles(monthSquare)),
      })

      return acc
    },
    []
  )

  return {
    square: athleteSquare,
    tiles: athleteTiles,
    tilesByMonth: athleteTilesByMonth,
  }
}

module.exports = {
  getAthleteTiles,
}
