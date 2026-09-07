import {Popup} from "@urbica/react-map-gl"
import React from "react"

// A tile is 2.4 km wide, so a popular one can hold hundreds of rides -- the
// list is cut and counted rather than scrolled forever
const MAX_LISTED = 12

const formatDate = (startDate) => startDate.substring(0, 10)

export const TilePopup = ({tile, activities, onClose}) =>
  tile && (
    <Popup
      longitude={tile.lngLat.lng}
      latitude={tile.lngLat.lat}
      onClose={onClose}
      closeButton
      closeOnClick={false}
      maxWidth="300px"
    >
      <div style={{fontFamily: "system-ui, sans-serif", fontSize: "13px"}}>
        <div style={{fontWeight: 700}}>
          Tile {tile.x}, {tile.y}
        </div>
        <div style={{marginBottom: "6px", color: "#6b7280"}}>
          {activities.length} activities went through
        </div>
        <ul style={{margin: 0, padding: "0 0 0 16px"}}>
          {activities.slice(0, MAX_LISTED).map((activity) => (
            <li key={activity.id}>
              <a
                href={`https://www.strava.com/activities/${activity.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {activity.name}
              </a>
              <span style={{color: "#6b7280"}}>
                {" "}
                {formatDate(activity.start_date)}
              </span>
            </li>
          ))}
        </ul>
        {activities.length > MAX_LISTED && (
          <div style={{color: "#6b7280"}}>
            and {activities.length - MAX_LISTED} more
          </div>
        )}
      </div>
    </Popup>
  )
