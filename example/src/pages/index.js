import "mapbox-gl/dist/mapbox-gl.css"

import React, {useState} from "react"

import {Activities} from "../components/map-activities"
import MapGL from "@urbica/react-map-gl"
import {Tiles} from "../components/map-tiles"
import {graphql} from "gatsby"

const Map = ({
  data: {
    stravaAthlete: {
      map: {tiles, square},
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
      <Tiles id="tiles" tiles={tiles} color="#ff0000" />
      <Activities id="activites" activities={activities} color="green" />
    </MapGL>
  )
}

export default Map

export const pageQuery = graphql`
  query Map {
    stravaAthlete {
      map {
        tiles {
          x
          y
          coords
        }
        square {
          x
          y
          coords
        }
      }
    }
    stravaActivities: allStravaActivity(filter: {map: {points: {ne: null}}}) {
      nodes {
        type
        map {
          points
        }
      }
    }
  }
`
