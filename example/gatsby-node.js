const fs = require("fs")
const path = require("path")

// `require("gatsby-strava-tiles/card")` in a real site -- this example resolves
// the plugin from the repository next to it
const {getActivityCards, renderActivityCard} = require("../card")

// How many of the most recent activities get a card. Drawing the whole history
// would mean thousands of images built and deployed for the handful a page ever
// shows, so this list is what drives the work: an activity outside it is never
// rendered and its background tiles are never fetched.
const CARDS = 20

const SIZE = {width: 600, height: 300}

// A neutral background on purpose. The site's own style is heavily green, which
// is the same hue as the covered tiles drawn over it -- readable as an
// interactive map you can zoom, unreadable as a 600px card. Passing no
// `tileUrl` at all drops the background entirely, which is lighter still but
// takes every place name with it.
const STYLE = "mapbox/light-v11"

// Deliberately not "cards": that is where the /cards page writes its own HTML,
// and page output and assets sharing a directory is a collision waiting for
// whoever adds a /cards/<something> page next
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

  // Every activity, but only its tiles. Walking the whole history is what lets
  // a card show the ground that was already covered *on the day of the ride*
  // rather than today's coverage -- which is the only thing that makes "new"
  // mean anything. It costs nothing: no coordinates are read here.
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

  // One group per activity -- each card here shows a single ride. A trip
  // spanning several days would instead group their ids together, e.g.
  // `[[day1, day2, day3], ...]`, to draw them as one merged card.
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

    // An activity's card never changes once drawn: what it shows is its own
    // track and the coverage that existed before it, and no later ride can
    // alter either
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
