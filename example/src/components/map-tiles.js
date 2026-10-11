import {Layer, Source} from "@urbica/react-map-gl"

import React, {useMemo} from "react"
import {latToY, lngToX} from "../../../utils/map"
import {tileToCoords} from "../../../utils/tiles"

const tileToFeature = (tile) => ({
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [tileToCoords(tile)],
  },
})

const tilesToFeatureCollection = (tiles) => ({
  type: "FeatureCollection",
  features: tiles.map((tile) => tileToFeature(tile)),
})

// One square per tile, or the outline of the whole area
const outlineToFeature = (outline) => ({
  type: "Feature",
  geometry: {
    type: "MultiPolygon",
    coordinates: outline,
  },
})

export const Tiles = ({
  id,
  tiles,
  outline,
  color,
  borderColor = color,
  borderWidth = 2,
  fillOpacity = 0.1,
  borderOpacity = 0.1,
  // Inserted under the city labels, each layer above the previous one
  before = "departments-border",
  onTileClick,
}) => {
  const data = useMemo(
    () =>
      outline ? outlineToFeature(outline) : tilesToFeatureCollection(tiles),
    [outline, tiles]
  )

  return (
    <>
      <Source id={id} type="geojson" data={data} />
      <Layer
        id={id}
        type="fill"
        source={id}
        before={before}
        paint={{
          "fill-color": color,
          "fill-opacity": fillOpacity,
        }}
        onClick={
          onTileClick &&
          (({lngLat}) =>
            onTileClick({x: lngToX(lngLat.lng), y: latToY(lngLat.lat), lngLat}))
        }
      />
      <Layer
        id={`${id}_borders`}
        type="line"
        source={id}
        before={before}
        paint={{
          "line-color": borderColor,
          "line-width": borderWidth,
          "line-opacity": borderOpacity,
        }}
      />
    </>
  )
}
