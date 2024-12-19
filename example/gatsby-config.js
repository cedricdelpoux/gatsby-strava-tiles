require("dotenv").config()

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
          after:
            new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 3,
              new Date().getDate()
            ).getTime() / 1000,
          //
          // Fetch more precice GPS data for some activities
          // ----
          // streamsTypes: ["latlng"],
          // withStreams: (activity) => [ID_1, ID2].includes(activity.id),
        },
      },
    },
    {
      resolve: require.resolve(`..`), // `gatsby-strava-tiles`
    },
  ],
}
