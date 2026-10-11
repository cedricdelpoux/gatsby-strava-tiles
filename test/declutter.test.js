const assert = require("node:assert/strict")
const {describe, it} = require("node:test")

const {declutter, simplify} = require("../utils/declutter")
const {getTileActivities} = require("../utils/tiles")

const LAT = 43.6

// A straight east-west track, a point every ~80 m
const track = (id, startDate, fromLng, toLng) => {
  const steps = Math.round((toLng - fromLng) / 0.001)
  const coordinates = Array.from({length: steps + 1}, (_, i) => [
    fromLng + i * 0.001,
    LAT,
  ])

  return {id, start_date: startDate, coordinates}
}

const walk = track("walk", "2024-01-10T08:00:00Z", 1.4, 1.41)
const ride = track("ride", "2024-03-05T08:00:00Z", 1.37, 1.5)
const secondWalk = track("second-walk", "2024-02-01T08:00:00Z", 1.401, 1.409)
const activities = [ride, secondWalk, walk]

describe("declutter, chronological order", () => {
  const results = declutter(activities, {order: "chronological"})

  it("keeps the first activity to cover a tile", () => {
    assert.equal(results.get("walk").hidden, false)
    assert.ok(results.get("walk").parts.length > 0)
  })

  it("hides an activity bringing no new tile", () => {
    assert.deepEqual(results.get("second-walk"), {
      hidden: true,
      reason: "no-new-tiles",
      tiles: results.get("second-walk").tiles,
      newTiles: 0,
      parts: null,
      stubs: null,
    })
  })

  it("cuts a later activity where it follows a road already drawn", () => {
    const {hidden, tiles, newTiles, stubs} = results.get("ride")

    assert.equal(hidden, false)
    assert.ok(newTiles > 0 && newTiles < tiles)
    // Dashes on both sides of the walk's road
    assert.ok(stubs.some(({dashUntil}) => dashUntil > 0))
  })

  it("never depends on later activities", () => {
    const before = declutter([walk, secondWalk], {order: "chronological"})

    assert.deepEqual(before.get("walk"), results.get("walk"))
    assert.deepEqual(before.get("second-walk"), results.get("second-walk"))
  })

  it("is the default order", () => {
    assert.deepEqual(declutter(activities), results)
  })
})

describe("declutter, coverage order", () => {
  const results = declutter(activities, {order: "coverage"})

  it("keeps the activity covering the most tiles, even a later one", () => {
    const {hidden, tiles, newTiles} = results.get("ride")

    assert.equal(hidden, false)
    assert.equal(newTiles, tiles)
  })

  it("hides the smaller activities that went through the same tiles", () => {
    assert.equal(results.get("walk").reason, "no-new-tiles")
    assert.equal(results.get("second-walk").reason, "no-new-tiles")
  })

  // Once `west` is drawn, `east` brings more new tiles than `middle`
  it("picks the most new tiles at each round", () => {
    const west = track("west", "2023-01-01T08:00:00Z", 2, 2.22)
    const middle = track("middle", "2023-01-02T08:00:00Z", 2.18, 2.31)
    const east = track("east", "2023-01-03T08:00:00Z", 2.27, 2.4)
    const chronological = declutter([west, middle, east])
    const coverage = declutter([west, middle, east], {order: "coverage"})

    assert.equal(coverage.get("east").newTiles, coverage.get("east").tiles)
    assert.ok(
      coverage.get("middle").newTiles < chronological.get("middle").newTiles
    )
  })
})

describe("declutter", () => {
  it("skips the activities without at least two points", () => {
    const results = declutter([
      {id: "empty", start_date: "2024-01-01", coordinates: []},
      {id: "none", start_date: "2024-01-01"},
      walk,
    ])

    assert.deepEqual([...results.keys()], ["walk"])
  })

  it("rejects an unknown order", () => {
    assert.throws(() => declutter(activities, {order: "random"}), /random/)
  })
})

describe("simplify", () => {
  it("drops the points of a straight line", () => {
    assert.deepEqual(simplify(walk.coordinates), [
      [1.4, LAT],
      [1.41, LAT],
    ])
  })
})

describe("getTileActivities", () => {
  it("lists every activity crossing each tile", () => {
    const tileActivities = getTileActivities(activities)
    const walkTiles = Object.keys(tileActivities).filter((tile) =>
      tileActivities[tile].includes("walk")
    )

    assert.ok(walkTiles.length > 0)
    walkTiles.forEach((tile) => {
      assert.ok(tileActivities[tile].includes("ride"))
    })
  })
})
