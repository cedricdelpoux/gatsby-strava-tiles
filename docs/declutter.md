# Declutter

Drawing every track of a long Strava history gives a map of blobs: the same
roads drawn tens of times, double lines a few meters apart, and small
activities buried under big ones. The declutter decides, for each activity,
what a map should draw of it, so that each road is drawn only once:

-   activities that bring nothing new are hidden,
-   the others lose the parts following a road already drawn, and the last
    meters before each cut are dashed to show that the track goes on,
-   zoomed out, from zoom 12 to 7, the passes falling a few pixels away from a
    line already drawn are hidden, so the map stays a drawing of clean lines.

It is disabled by default: it takes a while (about 20 seconds for 3000
activities), and a site that doesn't draw tracks has no use for it.

## Options

```js
// gatsby-config.js
module.exports = {
    plugins: [
        "gatsby-source-strava",
        {
            resolve: "gatsby-strava-tiles",
            options: {
                declutter: {
                    order: "chronological",
                    // Only the activities the map shows are compared: a
                    // private or an indoor activity must not hide a public one
                    filter: (activity) =>
                        ["Run", "Ride", "Hike"].includes(activity.type) &&
                        activity.visibility === "everyone",
                },
            },
        },
    ],
}
```

| Option   | Default             | What it is                                                               |
| -------- | ------------------- | ------------------------------------------------------------------------ |
| `order`  | `"chronological"`   | How the activities to draw are picked, `"chronological"` or `"coverage"` |
| `filter` | every activity kept | `(activity) => boolean`, the `StravaActivity` nodes to compare           |

Only activities with at least two points are ever compared. An activity left
out by `filter` gets no `declutter` (`null`).

### `order: "chronological"`

The activities are walked by `start_date`, like `StravaActivity.tiles`. An
activity is drawn if it covers at least one tile no earlier activity covered,
and only the pieces of its track going through those new tiles are kept.

An activity only ever depends on the ones before it: the map of a given month
is exactly the declutter of every activity up to that month, and adding an
activity never changes how the earlier ones are drawn. Pick this one for a
timeline, or to replay your history month by month.

### `order: "coverage"`

A greedy set cover: the activity covering the most tiles is drawn first, then
at each round the one bringing the most tiles not covered yet. A walk that
covered 1 tile first gives way to a ride that went through the same place
later and covers 10, so the map is drawn with fewer, longer tracks.

Once every track is known, the start or the end of an activity following the
track of an activity picked after it is also cut. An activity can then depend
on later ones, so a new activity can change how older ones are drawn.

## `StravaActivity.declutter`

```graphql
{
    allStravaActivity {
        nodes {
            declutter {
                hidden
                reason
                tiles
                newTiles
                parts
                stubs {
                    dashUntil
                    hideUntil
                    coordinates
                }
            }
        }
    }
}
```

| Field      | Type            | What it is                                                                  |
| ---------- | --------------- | --------------------------------------------------------------------------- |
| `hidden`   | Boolean         | `true` when nothing of the activity is drawn                                |
| `reason`   | String          | Why it is hidden: `"no-new-tiles"` or `"already-traced"`, `null` when drawn |
| `tiles`    | Int             | How many tiles the track goes through                                       |
| `newTiles` | Int             | How many of them it brings, in the `order` picked                           |
| `parts`    | [[[Float]]]     | Pieces of track drawn solid at every zoom, as `[lng, lat]` lines            |
| `stubs`    | [DeclutterStub] | Pieces of track depending on the zoom, see below                            |

-   `"no-new-tiles"`: the activity covers no tile that an activity picked
    before it did not already cover.
-   `"already-traced"`: it brings new tiles, but the pieces of its track going
    through them all follow roads already drawn.

`newTiles` can differ from the length of `StravaActivity.tiles`: it only
counts the activities kept by `filter`, follows `order`, and doesn't skip the
GPS pauses of the raw streams.

A stub is hidden under `hideUntil`, dashed under `dashUntil`, and solid above
both, `0` meaning never. With Mapbox or MapLibre, each piece is a feature with
these two properties, and the layers filter on the zoom:

```js
// Dashed below `dashUntil`
;[
    "all",
    [">", ["get", "dashUntil"], ["zoom"]],
    ["<=", ["get", "hideUntil"], ["zoom"]],
]
```

`declutter` is its own node, `Declutter`, rather than a field added to the
activity: Gatsby runs a page query again when a node it read changes, not when
a field added to another node does.

The result is kept in Gatsby's cache, and only computed again when an
activity is added, removed or changed, or when `order` changes.

## Tracks and tile index

The declutter only draws what is new. To show a whole track when an activity
is selected, or the activities going through a tile on click, write these
files from your own `gatsby-node.js`, in the format your site needs:

```js
const {simplify} = require("gatsby-strava-tiles/utils/declutter")
const {getTileActivities} = require("gatsby-strava-tiles/utils/tiles")

// A full track, a few hundred points instead of thousands
simplify(activity.coordinates)

// {"8195-5898": ["123", "456"], ...}: every activity going through each tile
getTileActivities(activities)
```

The declutter itself can also be called directly, outside of Gatsby:

```js
const {declutter} = require("gatsby-strava-tiles/utils/declutter")

// Map of activity id to {hidden, reason, tiles, newTiles, parts, stubs}
const results = declutter(activities, {order: "coverage"})
```
