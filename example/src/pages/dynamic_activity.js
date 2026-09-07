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
import {distinctTiles, getCluster, getSquare} from "../../../utils/tiles"

import MapGL from "@urbica/react-map-gl"
import {PlaybackBar} from "../components/playback-bar"
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
  const [isPlaying, setIsPlaying] = useState(true)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const activity = useMemo(
    () => activities[currentActivityIndex],
    [currentActivityIndex]
  )
  const oldTiles = useMemo(
    () =>
      activities
        .slice(0, currentActivityIndex)
        .flatMap((activity) => activity.tiles),
    [currentActivityIndex]
  )
  const tilesSoFar = useMemo(
    () => [...oldTiles, ...(activity ? activity.tiles : [])],
    [oldTiles, activity]
  )
  const newTiles = useMemo(() => (activity ? activity.tiles : []), [activity])
  const square = useMemo(() => getSquare(tilesSoFar), [tilesSoFar])
  const cluster = useMemo(
    () => getCluster(tilesSoFar).filter(distinctTiles(square.tiles)),
    [tilesSoFar, square]
  )
  const rest = useMemo(
    () => tilesSoFar.filter(distinctTiles([...square.tiles, ...cluster])),
    [tilesSoFar, square, cluster]
  )
  const visibleSquare = useMemo(
    () => square.tiles.filter(distinctTiles(newTiles)),
    [square, newTiles]
  )
  const visibleCluster = useMemo(
    () => cluster.filter(distinctTiles(newTiles)),
    [cluster, newTiles]
  )
  const visibleRest = useMemo(
    () => rest.filter(distinctTiles(newTiles)),
    [rest, newTiles]
  )

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentActivityIndex((index) =>
        index < activities.length - 1 ? index + 1 : 0
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [activities, isPlaying])

  const handleIndexChange = (index) => {
    setIsPlaying(false)
    setCurrentActivityIndex(index)
  }

  return (
    <>
      <PlaybackBar
        index={currentActivityIndex}
        max={activities.length - 1}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((playing) => !playing)}
        onIndexChange={handleIndexChange}
      >
        <div>{activity && activity.start_date}</div>
        <div>Square: {square.size}</div>
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
        {activity && (
          <>
            <Tiles id="square" tiles={visibleSquare} color={SQUARE_COLOR} />
            <Tiles id="cluster" tiles={visibleCluster} color={CLUSTER_COLOR} />
            <Tiles id="tiles" tiles={visibleRest} color={TILE_COLOR} />
            <Tiles id="new" tiles={newTiles} color={NEW_TILE_COLOR} />
            <Activities
              id="activites"
              activities={[activity]}
              color={ACTIVITY_COLOR}
              onActivityClick={setSelectedActivity}
            />
            <ActivityPopup
              activity={selectedActivity}
              onClose={() => setSelectedActivity(null)}
            />
          </>
        )}
      </MapGL>
    </>
  )
}

export default Map

export const pageQuery = graphql`
  query ActivityMap {
    stravaActivities: allStravaActivity(
      sort: {start_date: ASC}
      filter: {coordinates: {ne: null}}
    ) {
      nodes {
        id
        start_date
        coordinates
        tiles {
          x
          y
        }
      }
    }
  }
`
