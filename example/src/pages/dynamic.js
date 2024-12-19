import "mapbox-gl/dist/mapbox-gl.css"

import React, {useEffect, useMemo, useState} from "react"

import {Activities} from "../components/map-activities"
import MapGL from "@urbica/react-map-gl"
import {Tiles} from "../components/map-tiles"
import {graphql} from "gatsby"

const Map = ({
  data: {
    stravaActivities: {nodes: activities},
  },
}) => {
  const [viewState, setViewState] = useState({
    zoom: 7,
    longitude: 1.183142,
    latitude: 43.708,
  })

  const [currentActivityIndex, setCurrentActivityIndex] = useState(0)
  const activity = useMemo(
    () => activities[currentActivityIndex],
    [currentActivityIndex]
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentActivityIndex((index) =>
        index < activities.length - 1 ? index + 1 : 0
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [activities])
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
      {activity && (
        <>
          {/* <Tiles id="square" tiles={square} color="#428cf4" /> */}
          <Tiles id="old" tiles={activity.tiles.parts.old} color="#2ca57e" />
          <Tiles id="new" tiles={activity.tiles.parts.new} color="#ff0000" />
          <Activities id="activites" activities={[activity]} color="#ff0000" />
        </>
      )}
    </MapGL>
  )
}

export default Map

export const pageQuery = graphql`
  query Map {
    stravaActivities: allStravaActivity(
      sort: {start_date: ASC}
      filter: {coordinates: {ne: null}}
    ) {
      nodes {
        coordinates
        tiles {
          all {
            coords
          }
          parts {
            old {
              coords
            }

            new {
              coords
            }
          }
        }
      }
    }
  }
`
