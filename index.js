// Gatsby only runs gatsby-node.js. This entry point is for a site's own code.
const {getActivityTiles} = require("./utils/activity")
const map = require("./utils/map")
const tiles = require("./utils/tiles")

module.exports = {getActivityTiles, ...map, ...tiles}
