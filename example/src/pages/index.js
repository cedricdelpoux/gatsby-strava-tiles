import "mapbox-gl/dist/mapbox-gl.css"

import React, {useState} from "react"

import {Activities} from "../components/map-activities"
import MapGL from "@urbica/react-map-gl"
import {Tiles} from "../components/map-tiles"
import {graphql} from "gatsby"

const Map = ({
  data: {
    stravaAthlete: {
      tiles: {
        parts: {squareBorder, square, cluster, rest},
      },
    },
    stravaActivities: {nodes: activities},
  },
}) => {
  const [viewState, setViewState] = useState({
    zoom: 7,
    longitude: 1.183142,
    latitude: 43.708,
  })
  return (
    <MapGL
      style={{
        width: "100vw",
        height: "100vh",
      }}
      accessToken={process.env.GATSBY_MAPBOX_TOKEN}
      latitude={viewState.latitude}
      longitude={viewState.longitude}
      zoom={viewState.zoom}
      onViewportChange={setViewState}
    >
      <Tiles id="square" tiles={square} color="#428cf4" />
      <Tiles id="cluster" tiles={cluster} color="#2ca57e" />
      <Tiles id="tiles" tiles={rest} color="#ff0000" />
      <Tiles
        id="squareBorder"
        tiles={[squareBorder]}
        color="#428cf4"
        fillOpacity={0}
        borderOpacity={0.5}
      />
      <Activities id="activites" activities={activities} color="#ff0000" />
    </MapGL>
  )
}

export default Map

export const pageQuery = graphql`
  query Map {
    stravaAthlete {
      tiles {
        parts {
          squareBorder {
            x
            y
            x2
            y2
            coords
          }
          square {
            x
            y
            coords
          }
          cluster {
            x
            y
            coords
          }
          rest {
            x
            y
            coords
          }
        }
      }
    }
    stravaActivities: allStravaActivity(filter: {coordinates: {ne: null}}) {
      nodes {
        coordinates
      }
    }
  }
`
