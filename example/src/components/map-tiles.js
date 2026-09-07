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

// The plugin gives the same area both ways, so drawing one or the other is a
// prop rather than another component: one square per tile with its own four
// borders, or the border of the whole area as a single shape
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
  // The style's own layer that sits under the city labels: everything drawn
  // before it stays under the place names, and each layer inserted there ends
  // up over the one inserted before it -- which is what orders the coverage,
  // then the tracks, under the labels
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
