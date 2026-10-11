import "mapbox-gl/dist/mapbox-gl.css"

import {BAR_HEIGHT, Stat, TopBar} from "../components/top-bar"
import {NEW_TILE_COLOR, PALETTE} from "../colors"
import React, {useMemo, useState} from "react"

import {Activities} from "../components/map-activities"
import MapGL from "@urbica/react-map-gl"
import {Tiles} from "../components/map-tiles"
import {graphql} from "gatsby"
import {uniqueTiles} from "../../../utils/tiles"

const coverageOutline = ({square, cluster, rest}) => [
  ...square,
  ...cluster,
  ...rest,
]

const RoutesMap = ({
  data: {
    stravaAthlete,
    allStravaRoute: {nodes: routes},
  },
}) => {
  const [viewState, setViewState] = useState({
    zoom: 7,
    longitude: 1.183142,
    latitude: 43.708,
  })
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  // Two routes can cross the same new tile
  const newTiles = useMemo(
    () => uniqueTiles(routes.flatMap((route) => route.tiles.new)),
    [routes]
  )
  const coverage = stravaAthlete
    ? coverageOutline(stravaAthlete.tiles.parts.outlines)
    : []

  return (
    <div style={{display: "flex", flexDirection: "column", height: "100vh"}}>
      <TopBar>
        <Stat value={routes.length} label="routes" />
        <Stat
          color={NEW_TILE_COLOR}
          value={newTiles.length}
          label="new tiles"
        />
      </TopBar>
      <MapGL
        style={{width: "100vw", height: `calc(100vh - ${BAR_HEIGHT}px)`}}
        accessToken={process.env.GATSBY_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/xuopled/cmlopmwg2009x01skbjqg7urz"
        latitude={viewState.latitude}
        longitude={viewState.longitude}
        zoom={viewState.zoom}
        onViewportChange={setViewState}
        onLoad={() => setIsMapLoaded(true)}
      >
        {isMapLoaded && (
          <>
            <Tiles
              id="coverage"
              tiles={[]}
              outline={coverage}
              {...PALETTE.tile}
            />
            <Tiles
              id="new"
              tiles={newTiles}
              color={NEW_TILE_COLOR}
              fillOpacity={0.3}
              borderOpacity={0.6}
            />
            <Activities
              id="routes"
              activities={routes}
              color={PALETTE.activity}
            />
          </>
        )}
      </MapGL>
    </div>
  )
}

export default RoutesMap

export const pageQuery = graphql`
  query RoutesMap {
    stravaAthlete {
      tiles {
        parts {
          outlines {
            square
            cluster
            rest
          }
        }
      }
    }
    allStravaRoute(filter: {coordinates: {ne: null}}) {
      nodes {
        id
        coordinates
        tiles {
          new {
            x
            y
          }
        }
      }
    }
  }
`
