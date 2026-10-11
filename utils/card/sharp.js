// Loaded on demand: `sharp` is an optional peer dependency
function getSharp() {
  try {
    return require("sharp")
  } catch (error) {
    throw new Error(
      "gatsby-strava-tiles: drawing activity cards needs `sharp`, which " +
        "could not be resolved from " +
        __dirname +
        ". Install it in your site: yarn add sharp"
    )
  }
}

module.exports = {getSharp}
