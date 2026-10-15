const assert = require("node:assert/strict")
const {describe, it} = require("node:test")

const {getTileActivities} = require("../utils/tiles")

const LAT = 43.6

// A straight east-west track, a point every ~80 m
const track = (id, fromLng, toLng) => {
  const steps = Math.round((toLng - fromLng) / 0.001)
  const coordinates = Array.from({length: steps + 1}, (_, i) => [
    fromLng + i * 0.001,
    LAT,
  ])

  return {id, coordinates}
}

describe("getTileActivities", () => {
  it("lists every activity crossing each tile", () => {
    const tileActivities = getTileActivities([
      track("ride", 1.37, 1.5),
      track("walk", 1.4, 1.41),
    ])
    const walkTiles = Object.keys(tileActivities).filter((tile) =>
      tileActivities[tile].includes("walk")
    )

    assert.ok(walkTiles.length > 0)
    walkTiles.forEach((tile) => {
      assert.ok(tileActivities[tile].includes("ride"))
    })
  })
})
