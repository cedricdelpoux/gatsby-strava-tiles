# `gatsby-strava-tiles` example

1. Install deps

```
yarn
```

2. Generate `stravaClientId` , `stravaClientSecret`, `stravaToken`

```
gatsby-source-strava-token

```

3. Launch dev env

```
yarn dev
```

## Pages

Every page reads the same `tiles` field -- what changes between them is only
what they draw with it.

| Route               | What it shows                                                      |
| ------------------- | ------------------------------------------------------------------ |
| `/`                 | The whole coverage, with a settings panel: theme, outlines, layers |
| `/dynamic_month`    | The same, month by month, with that month's new tiles highlighted  |
| `/dynamic_activity` | The same, activity by activity                                     |
| `/cards`            | One image per recent activity, drawn at build time                 |
