# Data

The plugin adds a `tiles` field to the `StravaActivity` and `StravaAthlete`
nodes created by [gatsby-source-strava][gatsby-source-strava]. All `x`/`y`
pairs are [slippy map](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames)
tile coordinates at zoom level 14.

> The field is inferred from the data, not declared upfront by the plugin, so
> it only appears in the GraphQL schema once at least one activity with
> coordinates has been fetched.

## `StravaActivity.tiles`

The tiles first covered by this activity -- not the ones it also crosses that
an earlier activity already covered.

```graphql
{
    allStravaActivity {
        nodes {
            tiles {
                x
                y
            }
        }
    }
}
```

## `StravaAthlete.tiles.parts`

The tile coverage across your whole history, split into the largest fully
covered square, the cluster around it, and the rest.

```graphql
{
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
                row {
                    x
                    y
                }
                column {
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
            }
        }
    }
}
```

| Field          | Type   | What it is                                                                       |
| -------------- | ------ | -------------------------------------------------------------------------------- |
| `squareSize`   | Int    | Side length, in tiles, of the largest square you have fully covered              |
| `squareBorder` | Tile   | That square as a single tile `size` wide, to draw its outline without its tiles  |
| `square`       | [Tile] | Every tile inside that square                                                    |
| `rowSize`      | Int    | Length of the longest unbroken east-west line of covered tiles                   |
| `rowBorder`    | Tile   | That line as a single `width` x `height` tile, to draw it without its own tiles  |
| `row`          | [Tile] | Every tile of that line                                                          |
| `columnSize`   | Int    | Length of the longest unbroken north-south line of covered tiles                 |
| `columnBorder` | Tile   | Same as `rowBorder`, one tile wide and `columnSize` tall                         |
| `column`       | [Tile] | Every tile of that line                                                          |
| `cluster`      | [Tile] | Tiles outside the square, but with all 4 neighbouring tiles also covered         |
| `rest`         | [Tile] | Every other covered tile                                                         |
| `outlines`     | Object | `square`, `cluster` and `rest` as outlines rather than individual tiles -- below |

`square`, `cluster` and `rest` split the coverage in three: every covered tile
is in exactly one of them. The max row and the max column are not part of that
split -- they cross it, and their tiles are also counted in whichever of the
three they fall in. Draw them as two lines over the map -- that is what they
are for.

## `outlines`

`square`, `cluster` and `rest` give you one square per tile, each with its own
four borders. `outlines` gives you the same three areas as the outline of what
they cover: the border of the union, holes included, as
[GeoJSON MultiPolygon](https://www.rfc-editor.org/rfc/rfc7946#section-3.1.7)
coordinates ready to drop into a `geometry`.

```graphql
{
    stravaAthlete {
        tiles {
            parts {
                outlines {
                    square
                    cluster
                    rest
                }
            }
        }
    }
}
```

Both shapes are always computed, so which one you use is decided by what you
query, not by an option -- query the tiles to draw a grid of squares, the
outline to draw one continuous shape. The outline is what you want when:

-   **the grid lines are noise.** One shape per area instead of a border around
    every tile.
-   **you are drawing a lot of tiles.** A whole history of 13882 tiles is 3
    features to outline instead of 13882 -- a 72x72 max square is a single
    rectangle, 5 points.
-   **the shape has to fit in a URL.** A static map image carries its overlay in
    the URL, and a few rings fit where thousands of squares never could.

Do not expect it to save bytes on its own. An area that is compact shrinks a
lot, but scattered tiles do not: an isolated tile is 5 outline points where it
was 1 `{x, y}` pair. Across a real 13882-tile history the three parts together
came out at 167 kB as outlines against 271 kB as tiles -- a win, but one that
comes from the max square and the cluster, not from `rest`.

## `StravaAthlete.tiles.monthly`

The same breakdown as `parts` above, computed cumulatively for each calendar
month you have an activity in -- as if your history stopped at the end of
that month.

```graphql
{
    stravaAthlete {
        tiles {
            monthly {
                yearMonth
                year
                month
                parts {
                    squareSize
                    rowSize
                    columnSize
                    square {
                        x
                        y
                    }
                    row {
                        x
                        y
                    }
                    column {
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
}
```

`parts` has every field listed above -- `squareBorder`, `rowBorder` and
`columnBorder` included -- plus:

| Field      | Type   | What it is                                                  |
| ---------- | ------ | ----------------------------------------------------------- |
| `new`      | [Tile] | Tiles first covered during that specific month              |
| `outlines` | Object | `square`, `cluster`, `rest` and `new` as outlines, as above |

## Example

The [`example`](../example) app queries and renders all of the above with
[mapbox-gl](https://docs.mapbox.com/mapbox-gl-js): [`index.js`](../example/src/pages/index.js)
for the overall coverage, [`dynamic_activity.js`](../example/src/pages/dynamic_activity.js)
animated activity by activity, and [`dynamic_month.js`](../example/src/pages/dynamic_month.js)
animated month by month.

`index.js` also switches, at runtime, between the two shapes -- tiles or
outlines -- which is only a matter of which field it hands to the same
component, and lets the max square and the cluster be turned off, which
recomputes the split rather than just hiding a layer (see
[the "why" comments in `index.js`](../example/src/pages/index.js) for what that
recompute means for tiles bordering the square). Clicking a tile lists the
activities that went through it: `StravaActivity.tiles` cannot answer that on
its own, since it holds only what an activity covered _first_, so the page
recomputes the tiles of the few tracks whose bounding box contains the clicked
one -- see [`tile-activities.js`](../example/src/tile-activities.js).

The [`cards`](./cards.md) documentation covers drawing an activity as an image
at build time, which uses `tiles` and `outlines` from above.

[gatsby-source-strava]: https://github.com/cedricdelpoux/gatsby-source-strava
