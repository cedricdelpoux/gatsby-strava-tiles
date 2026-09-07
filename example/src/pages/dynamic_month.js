import "mapbox-gl/dist/mapbox-gl.css"

import {
  ACTIVITY_COLOR,
  CLUSTER_COLOR,
  NEW_TILE_COLOR,
  SQUARE_COLOR,
  TILE_COLOR,
} from "../colors"
import {Activities, ActivityPopup} from "../components/map-activities"
import React, {useEffect, useMemo, useState} from "react"

import MapGL from "@urbica/react-map-gl"
import {PlaybackBar} from "../components/playback-bar"
import {Tiles} from "../components/map-tiles"
import {distinctTiles} from "../../../utils/tiles"
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
  const [isPlaying, setIsPlaying] = useState(true)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const yearMonth = useMemo(
    () => yearMonths.distinct[yearMonthIndex],
    [yearMonthIndex]
  )
  const monthActivities = useMemo(
    () => activities.filter(({start_date}) => start_date.startsWith(yearMonth)),
    [yearMonth]
  )
  const monthTiles = useMemo(
    () => tiles.monthly.find((tiles) => tiles.yearMonth === yearMonth).parts,
    [yearMonth, tiles]
  )
  const monthSquare = useMemo(
    () => monthTiles.square.filter(distinctTiles(monthTiles.new)),
    [monthTiles]
  )
  const monthCluster = useMemo(
    () => monthTiles.cluster.filter(distinctTiles(monthTiles.new)),
    [monthTiles]
  )
  const monthRest = useMemo(
    () => monthTiles.rest.filter(distinctTiles(monthTiles.new)),
    [monthTiles]
  )

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setYearMonthIndex((index) =>
        index < yearMonths.distinct.length - 1 ? index + 1 : 0
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [yearMonths, isPlaying])

  const handleIndexChange = (index) => {
    setIsPlaying(false)
    setYearMonthIndex(index)
  }

  return (
    <>
      <PlaybackBar
        index={yearMonthIndex}
        max={yearMonths.distinct.length - 1}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((playing) => !playing)}
        onIndexChange={handleIndexChange}
      >
        <div>{yearMonth}</div>
        <div>Square: {monthTiles.squareSize}</div>
      </PlaybackBar>
      <MapGL
        style={{
          width: "100vw",
          height: "100vh",
        }}
        accessToken={process.env.GATSBY_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/xuopled/cmlopmwg2009x01skbjqg7urz"
        latitude={viewState.latitude}
        longitude={viewState.longitude}
        zoom={viewState.zoom}
        onViewportChange={setViewState}
      >
        {monthTiles && (
          <>
            <Tiles id="square" tiles={monthSquare} color={SQUARE_COLOR} />
            <Tiles id="cluster" tiles={monthCluster} color={CLUSTER_COLOR} />
            <Tiles id="tiles" tiles={monthRest} color={TILE_COLOR} />
            <Tiles id="new" tiles={monthTiles.new} color={NEW_TILE_COLOR} />
          </>
        )}
        {monthActivities && (
          <Activities
            id="activites"
            activities={monthActivities}
            color={ACTIVITY_COLOR}
            onActivityClick={setSelectedActivity}
          />
        )}
        <ActivityPopup
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      </MapGL>
    </>
  )
}

export default Map

export const pageQuery = graphql`
  query MonthMap {
    stravaAthlete {
      tiles {
        monthly {
          yearMonth
          parts {
            squareSize
            square {
              x
              y
            }
            cluster {
              x
              y
            }
            rest {
              x
              y
            }
            new {
              x
              y
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
        id
        start_date
        coordinates
      }
    }
  }
`
