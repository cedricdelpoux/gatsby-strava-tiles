import {Layer, Popup, Source} from "@urbica/react-map-gl"

import React from "react"

const activityToFeature = (activity) => ({
  type: "Feature",
  properties: {
    id: activity.id,
  },
  geometry: {
    coordinates: activity.coordinates,
    type: "LineString",
  },
})

const activitiesToFeatureCollection = (activities) => ({
  type: "FeatureCollection",
  features: activities.map((activity) => activityToFeature(activity)),
})

export const Activities = ({id, activities, color, onActivityClick}) => (
  <>
    <Source
      id={id}
      type="geojson"
      data={activitiesToFeatureCollection(activities)}
    />
    <Layer
      id={id}
      type="line"
      source={id}
      layout={{
        "line-join": "round",
        "line-cap": "round",
      }}
      paint={{
        "line-color": color,
        "line-width": 2,
        "line-opacity": 0.5,
      }}
      before="departments-border"
      onClick={
        onActivityClick &&
        ((event) => {
          const [feature] = event.features
          if (feature) {
            onActivityClick({id: feature.properties.id, lngLat: event.lngLat})
          }
        })
      }
    />
  </>
)

export const ActivityPopup = ({activity, onClose}) =>
  activity && (
    <Popup
      longitude={activity.lngLat.lng}
      latitude={activity.lngLat.lat}
      onClose={onClose}
      closeButton
      closeOnClick={false}
    >
      Activity: {activity.id}
    </Popup>
  )
