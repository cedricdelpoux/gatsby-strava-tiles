# Changelog

## [0.4.0] - 2026-10-11

### Added

-   `StravaRoute.tiles`, with `all` the tiles a route crosses and `new` the
    ones no activity has covered yet, the tiles the route would earn. They are
    computed at build time like the activities' tiles, and the field exists
    even when the site has no route. See the [data](./docs/data.md)
    documentation.
-   `getTileActivities` is exported, so that a site can write its own index
    of the activities going through each tile.

### Changed

-   `gatsby-source-strava` 4.3.0 or later is required, since it creates the
    `StravaRoute` nodes.

### Fixed

-   Since 0.3.2, a site reading `tiles` in its own `createPages` got empty
    lists after a `gatsby clean`, because the tiles were computed after it.
    They are now computed before.

## [0.3.2] - 2026-10-11

### Fixed

-   Restarting `gatsby develop` or `gatsby build` with Gatsby's cache kept
    computed the tiles from the activities fetched since the previous run
    only, instead of the whole history, so `StravaAthlete.tiles` came out
    nearly empty. The tiles are now always computed from every activity.

## [0.3.1] - 2026-09-18

### Fixed

-   `tiles` could silently disappear from the GraphQL schema when every
    sourced activity had no coordinates yet. Its shape is now declared
    explicitly, so it always resolves, empty or not.
-   Building the schema logged two harmless but noisy warnings. Fixed.

## [0.3.0] - 2026-09-07

### Added

-   `parts.rowSize`, `parts.rowBorder`, `parts.row`, `parts.columnSize`,
    `parts.columnBorder` and `parts.column` -- the longest unbroken row and
    column of covered tiles, both overall and month by month. See the
    [data](./docs/data.md) documentation.
-   Activity cards: draw one activity as a single image at build time, via the
    new `gatsby-strava-tiles/card` entry point (`getActivityCards`,
    `renderActivityCard`). See the [cards](./docs/cards.md) documentation.
    -   `outlined` option: one continuous shape per area instead of one square
        per tile.
    -   Configurable `style` -- colours, fill/stroke opacity, stroke width,
        badge colours.
    -   `groups` in `getActivityCards`, to merge several activities (a
        multi-day trip) into a single card.
    -   Draws on a real map background when given a `tileUrl`, or a flat
        colour otherwise.
-   `sharp` declared as an optional peer dependency, needed only for activity
    cards.

### Fixed

-   `repository` in `package.json` pointed to the wrong GitHub repository.

## [0.2.1] - 2024-12-20

## [0.2.0] - 2024-12-19
