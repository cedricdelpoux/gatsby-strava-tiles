import {latToY, lngToX} from "../../utils/map"

import {pointsToTiles} from "../../utils/tiles"

// `StravaActivity.tiles` holds only the tiles an activity covered *first*, so
// it cannot answer "which rides went through here": a ride over ground already
// covered has an empty `tiles`. The tiles a track runs through are recomputed
// from its coordinates instead -- the same coordinates the map has already
// loaded to draw the tracks.
//
// Lazily though. A whole history is a few million points, and walking all of
// them on load would cost seconds for a popup that may never be opened. A
// bounding box in tile space rules out almost every activity for a given tile,
// and only the survivors are ever walked -- once, then cached.
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

  // A tile is only ever crossed between two recorded points, so an activity
  // whose box misses the tile cannot have gone through it
  return ({x, y}) =>
    getBoundingBoxes()
      .filter(
        (box) =>
          x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY
      )
      .map(({activity}) => activity)
      .filter((activity) => getTiles(activity).has(`${x}-${y}`))
}
