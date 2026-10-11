const fs = require("fs")
const path = require("path")

// `require("gatsby-strava-tiles/card")` in a real site
const {getActivityCards, renderActivityCard} = require("../card")

// Only the most recent activities get a card
const CARDS = 20

const SIZE = {width: 600, height: 300}

// Neutral, so the green tiles drawn over it stay readable
const STYLE = "mapbox/light-v11"

// Not `public/cards`, where the /cards page is written
const IMAGES_DIR = path.join(__dirname, "public", "activity-cards")
const TILE_CACHE_DIR = path.join(__dirname, ".cache", "card-background-tiles")

const tileUrl = ({z, x, y}) =>
  `https://api.mapbox.com/styles/v1/${STYLE}/tiles/256/${z}/${x}/${y}@2x` +
  `?access_token=${process.env.GATSBY_MAPBOX_TOKEN}`

exports.createPages = async ({graphql, actions: {createPage}, reporter}) => {
  if (!process.env.GATSBY_MAPBOX_TOKEN) {
    reporter.warn("GATSBY_MAPBOX_TOKEN is missing, skipping the activity cards")
    return
  }

  // Every activity's tiles, so a card shows the coverage on the day
  const history = await graphql(`
    {
      allStravaActivity(filter: {coordinates: {ne: null}}) {
        nodes {
          id
          start_date
          tiles {
            x
            y
          }
        }
      }
    }
  `)

  if (history.errors) {
    reporter.panicOnBuild("Error querying the activity tiles", history.errors)
    return
  }

  // The heavy fields, for the few activities that actually get drawn
  const recent = await graphql(`
    {
      allStravaActivity(
        sort: {start_date: DESC}
        filter: {coordinates: {ne: null}}
        limit: ${CARDS}
      ) {
        nodes {
          id
          name
          distance
          start_date
          coordinates
          tiles {
            x
            y
          }
        }
      }
    }
  `)

  if (recent.errors) {
    reporter.panicOnBuild(
      "Error querying the activities to draw",
      recent.errors
    )
    return
  }

  // One card per activity. Group several ids to merge a multi-day trip.
  const activities = recent.data.allStravaActivity.nodes
  const drawable = getActivityCards({
    activities: history.data.allStravaActivity.nodes,
    groups: activities.map(({id}) => [id]),
  })
  const byId = new Map(drawable.map((card) => [card.ids[0], card]))

  fs.mkdirSync(IMAGES_DIR, {recursive: true})

  const cards = []

  for (const activity of activities) {
    const name = `${activity.id}.webp`.replace(/[^a-zA-Z0-9.\-_]/g, "_")
    const file = path.join(IMAGES_DIR, name)

    cards.push({
      id: activity.id,
      name: activity.name,
      distance: activity.distance,
      startDate: activity.start_date,
      added: activity.tiles.length,
      image: `/activity-cards/${name}`,
    })

    // A drawn card never changes
    if (fs.existsSync(file)) continue

    const {image} = await renderActivityCard({
      ...byId.get(activity.id),
      coordinates: activity.coordinates,
      size: SIZE,
      tileUrl,
      cacheDir: TILE_CACHE_DIR,
    })

    fs.writeFileSync(file, image)
  }

  reporter.info(`Activity cards: ${cards.length} drawn or already on disk`)

  createPage({
    path: "/cards",
    component: path.resolve("./src/templates/cards.js"),
    context: {cards, size: SIZE},
  })
}
