require("dotenv").config()

const fs = require("fs")
const path = require("path")

// Activities whose `summary_polyline` is too coarse to cover every tile they
// crossed, given the full `latlng` stream instead. The list is personal, so
// the file is gitignored and the example runs without it.
const PRECISE_ACTIVITIES_FILE = path.join(__dirname, "precise-activities.json")
const preciseActivities = new Set(
  fs.existsSync(PRECISE_ACTIVITIES_FILE) ? require(PRECISE_ACTIVITIES_FILE) : []
)

module.exports = {
  plugins: [
    {
      resolve: "gatsby-source-strava",
      options: {
        stravaClientId: process.env.STRAVA_CLIENT_ID,
        stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
        stravaToken: process.env.STRAVA_TOKEN,
        debug: true,
        activities: {
          // Also read by `yarn sync-activities`, which fetches the stream of
          // the listed activities already in the store
          streamsTypes: ["latlng"],
          withStreams: (activity) => preciseActivities.has(String(activity.id)),
        },
      },
    },
    {
      resolve: require.resolve(`..`), // `gatsby-strava-tiles`
    },
  ],
}
