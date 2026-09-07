# Changelog

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
