import "mapbox-gl/dist/mapbox-gl.css"

import React, {useEffect, useMemo, useState} from "react"

import {Activities} from "../components/map-activities"
import MapGL from "@urbica/react-map-gl"
import {Tiles} from "../components/map-tiles"
import {graphql} from "gatsby"

const Map = ({
  data: {
    stravaAthlete: {tiles},
    yearMonths,
    stravaActivities: {nodes: activities},
  },
}) => {
  const [viewState, setViewState] = useState({
    zoom: 7,
    longitude: 1.183142,
    latitude: 43.708,
  })

  const [yearMonthIndex, setYearMonthIndex] = useState(0)
  const yearMonth = useMemo(
    () => yearMonths.distinct[yearMonthIndex],
    [yearMonthIndex]
  )
  const monthActivities = useMemo(
    () => activities.filter(({start_date}) => start_date.startsWith(yearMonth)),
    [yearMonth]
  )
  const monthTiles = useMemo(
    () =>
      tiles.monthly.find((tiles) => tiles.yearMonth === yearMonth).tiles.parts,
    [yearMonth, tiles]
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setYearMonthIndex((index) =>
        index < yearMonths.distinct.length - 1 ? index + 1 : 0
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [yearMonths])
  return (
    <>
      <div>{yearMonth}</div>
      <div>Square: {monthTiles.squareSize}</div>
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
        {monthTiles && (
          <>
            <Tiles id="square" tiles={monthTiles.square} color="#428cf4" />
            <Tiles id="cluster" tiles={monthTiles.cluster} color="#2ca57e" />
            <Tiles id="tiles" tiles={monthTiles.rest} color="#ff0000" />
          </>
        )}
        {monthActivities && (
          <Activities
            id="activites"
            activities={monthActivities}
            color="#ff0000"
          />
        )}
      </MapGL>
    </>
  )
}

export default Map

export const pageQuery = graphql`
  query Map {
    stravaAthlete {
      tiles {
        monthly {
          yearMonth
          tiles {
            parts {
              squareSize
              square {
                coords
              }
              cluster {
                coords
              }
              rest {
                coords
              }
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
    yearMonths: allStravaAthlete {
      distinct(field: {tiles: {monthly: {yearMonth: SELECT}}})
    }
    stravaActivities: allStravaActivity(
      sort: {start_date: ASC}
      filter: {coordinates: {ne: null}}
    ) {
      nodes {
        start_date
        coordinates
      }
    }
  }
`
