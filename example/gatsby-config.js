require("dotenv").config()

const fs = require("fs")
const path = require("path")

// Activities given their full `latlng` stream, for more precise tiles.
// Personal and gitignored, so the file is optional.
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
          // Also read by `yarn sync-activities`
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
