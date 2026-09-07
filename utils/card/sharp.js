// Loaded on demand, never at import time, so that a site using nothing but the
// tile data does not have to install an image library it will never call.
// `sharp` is declared as an optional peer dependency for the same reason.
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
