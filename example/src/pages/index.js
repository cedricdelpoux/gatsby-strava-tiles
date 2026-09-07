import "mapbox-gl/dist/mapbox-gl.css"

import {BAR_HEIGHT, Stat, TopBar} from "../components/top-bar"
import React, {useMemo, useState} from "react"
import {distinctTiles, getCluster, tilesToOutline} from "../../../utils/tiles"

import {Activities} from "../components/map-activities"
import MapGL from "@urbica/react-map-gl"
import {PALETTE} from "../colors"
import {TilePopup} from "../components/tile-popup"
import {Tiles} from "../components/map-tiles"
import {createTileIndex} from "../tile-activities"
import {graphql} from "gatsby"

const Map = ({
  data: {
    stravaAthlete: {
      tiles: {parts},
    },
    stravaActivities: {nodes: activities, totalCount},
  },
}) => {
  const [viewState, setViewState] = useState({
    zoom: 7,
    longitude: 1.183142,
    latitude: 43.708,
  })
  const [settings, setSettings] = useState({
    outlined: false,
    square: true,
    cluster: true,
    lines: true,
    activities: true,
  })
  const [selectedTile, setSelectedTile] = useState(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  const palette = PALETTE
  const handleSettingsChange = (patch) =>
    setSettings((current) => ({...current, ...patch}))
  const kilometers = useMemo(
    () =>
      Math.round(
        activities.reduce((total, {distance}) => total + distance, 0) / 1000
      ),
    [activities]
  )
  const tilesCount =
    parts.square.length + parts.cluster.length + parts.rest.length

  const findActivities = useMemo(
    () => createTileIndex(activities),
    [activities]
  )
  const tileActivities = useMemo(
    () => (selectedTile ? findActivities(selectedTile) : []),
    [selectedTile, findActivities]
  )
  const allTiles = useMemo(
    () => [...parts.square, ...parts.cluster, ...parts.rest],
    [parts]
  )
  const fullCluster = useMemo(() => getCluster(allTiles), [allTiles])
  const nonSquareTiles = useMemo(
    () => (settings.square ? [...parts.cluster, ...parts.rest] : allTiles),
    [settings.square, parts, allTiles]
  )
  const squareAdjustedCluster = settings.square ? parts.cluster : fullCluster
  const clusterTiles = settings.cluster ? squareAdjustedCluster : []
  const restTiles = useMemo(
    () => nonSquareTiles.filter(distinctTiles(clusterTiles)),
    [nonSquareTiles, clusterTiles]
  )
  const isDefaultSplit = settings.square && settings.cluster
  const squareOutline = settings.outlined ? parts.outlines.square : undefined
  const clusterOutline = useMemo(() => {
    if (!settings.outlined || !settings.cluster) return undefined

    return isDefaultSplit
      ? parts.outlines.cluster
      : tilesToOutline(clusterTiles)
  }, [settings.outlined, settings.cluster, isDefaultSplit, parts, clusterTiles])
  const restOutline = useMemo(() => {
    if (!settings.outlined) return undefined

    return isDefaultSplit ? parts.outlines.rest : tilesToOutline(restTiles)
  }, [settings.outlined, isDefaultSplit, parts, restTiles])

  return (
    <div style={{display: "flex", flexDirection: "column", height: "100vh"}}>
      <TopBar settings={settings} onSettingsChange={handleSettingsChange}>
        <Stat value={totalCount} label="activities" />
        <Stat value={`${kilometers}km`} label="ridden" />
        <Stat color={palette.tile.color} value={tilesCount} label="tiles" />
        <Stat
          color={palette.cluster.color}
          value={parts.square.length + parts.cluster.length}
          label="cluster"
        />
        <Stat
          color={palette.maxSquare.color}
          value={`${parts.squareSize} × ${parts.squareSize}`}
          label="max square"
        />
        <Stat
          color={palette.maxRow.color}
          value={parts.rowSize}
          label="max row"
        />
        <Stat
          color={palette.maxColumn.color}
          value={parts.columnSize}
          label="max column"
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
            {settings.square && (
              <Tiles
                id="square"
                tiles={parts.square}
                outline={squareOutline}
                onTileClick={setSelectedTile}
                color={palette.maxSquare.color}
                fillOpacity={palette.maxSquare.fillOpacity}
                borderOpacity={palette.maxSquare.borderOpacity}
              />
            )}
            <Tiles
              id="cluster"
              tiles={clusterTiles}
              outline={clusterOutline}
              onTileClick={setSelectedTile}
              {...palette.cluster}
            />
            <Tiles
              id="tiles"
              tiles={restTiles}
              outline={restOutline}
              onTileClick={setSelectedTile}
              {...palette.tile}
            />
            {settings.square && (
              <Tiles
                id="squareBorder"
                tiles={[parts.squareBorder]}
                color={palette.maxSquare.color}
                fillOpacity={0}
                borderOpacity={palette.maxSquare.outlineOpacity}
                borderWidth={palette.maxSquare.outlineWidth}
              />
            )}
            {settings.activities && (
              <Activities
                id="activites"
                activities={activities}
                color={palette.activity}
              />
            )}
            {settings.lines && (
              <>
                <Tiles
                  id="row"
                  tiles={[parts.rowBorder]}
                  color={palette.maxRow.color}
                  fillOpacity={palette.maxRow.fillOpacity}
                  borderOpacity={palette.maxRow.borderOpacity}
                />
                <Tiles
                  id="column"
                  tiles={[parts.columnBorder]}
                  color={palette.maxColumn.color}
                  fillOpacity={palette.maxColumn.fillOpacity}
                  borderOpacity={palette.maxColumn.borderOpacity}
                />
              </>
            )}
            <TilePopup
              tile={selectedTile}
              activities={tileActivities}
              onClose={() => setSelectedTile(null)}
            />
          </>
        )}
      </MapGL>
    </div>
  )
}

export default Map

export const pageQuery = graphql`
  query IndexMap {
    stravaAthlete {
      tiles {
        parts {
          squareSize
          squareBorder {
            x
            y
            size
          }
          rowSize
          rowBorder {
            x
            y
            width
            height
          }
          columnSize
          columnBorder {
            x
            y
            width
            height
          }
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
          outlines {
            square
            cluster
            rest
          }
        }
      }
    }
    stravaActivities: allStravaActivity(
      sort: {start_date: DESC}
      filter: {coordinates: {ne: null}}
    ) {
      totalCount
      nodes {
        id
        name
        distance
        start_date
        coordinates
      }
    }
  }
`
