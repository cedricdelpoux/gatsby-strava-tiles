import {latToY, lngToX} from "../../utils/map"

import {pointsToTiles} from "../../utils/tiles"

// `tiles` only holds the tiles an activity covered first, so the tiles a
// track crosses are recomputed from its coordinates, lazily: a bounding box
// rules out most activities, and the rest are walked once, then cached.
const getBoundingBox = (coordinates) =>
  coordinates.reduce(
    (box, [lng, lat]) => {
      const x = lngToX(lng)
      const y = latToY(lat)

      return {
        minX: Math.min(box.minX, x),
        maxX: Math.max(box.maxX, x),
        minY: Math.min(box.minY, y),
        maxY: Math.max(box.maxY, y),
      }
    },
    {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity}
  )

export const createTileIndex = (activities) => {
  const tilesById = new Map()
  let boundingBoxes = null

  const getBoundingBoxes = () => {
    boundingBoxes =
      boundingBoxes ||
      activities.map((activity) => ({
        activity,
        ...getBoundingBox(activity.coordinates),
      }))

    return boundingBoxes
  }

  const getTiles = (activity) => {
    let tiles = tilesById.get(activity.id)

    if (!tiles) {
      tiles = new Set(
        pointsToTiles(activity.coordinates).map(({x, y}) => `${x}-${y}`)
      )
      tilesById.set(activity.id, tiles)
    }

    return tiles
  }

  // An activity whose box misses the tile can't cross it
  return ({x, y}) =>
    getBoundingBoxes()
      .filter(
        (box) =>
          x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY
      )
      .map(({activity}) => activity)
      .filter((activity) => getTiles(activity).has(`${x}-${y}`))
}
