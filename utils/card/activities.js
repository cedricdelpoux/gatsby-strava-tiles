const {getCluster, distinctTiles} = require("../tiles")

// What each group in `groups` needs to be drawn, gathered in one walk of the
// whole history rather than one walk per card. `activities` is every activity
// with the plugin's `tiles` field, as `{id, start_date, tiles}`.
//
// `groups` is the ids to draw, each as its own array -- one activity most of
// the time (`[id]`), several for a multi-day trip drawn as a single card
// (`[day1, day2, day3]`). A group is treated as if it had been recorded as one
// activity spanning from its first member's start to its last: `added` is the
// union of what its members were each first to cover (already mutually
// exclusive, since the plugin only ever credits a tile to the first activity
// to reach it), and `coverage`/`clustered` bracket the whole span, so ground
// covered by anything else in between still counts towards them.
function getActivityCards({activities, groups}) {
  // Strings throughout: ids come in as either, and a mismatch would quietly
  // match nothing at all
  const groupIndexByActivityId = new Map()
  groups.forEach((ids, groupIndex) => {
    ids.forEach((id) => groupIndexByActivityId.set(String(id), groupIndex))
  })

  // Gatsby hands nodes over in creation order, which is not chronological
  const sorted = [...activities].sort((a, b) =>
    a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0
  )

  const coverage = []
  const inProgress = groups.map(() => null)

  sorted.forEach((activity) => {
    const added = activity.tiles || []
    const groupIndex = groupIndexByActivityId.get(String(activity.id))

    if (groupIndex !== undefined) {
      inProgress[groupIndex] = inProgress[groupIndex] || {
        before: [...coverage],
        added: [],
      }
      inProgress[groupIndex].added.push(...added)
    }

    coverage.push(...added)

    // Overwritten on every member seen, so once the walk ends this holds the
    // state right after the group's *last* activity -- not just its own
    if (groupIndex !== undefined) {
      inProgress[groupIndex].after = [...coverage]
    }
  })

  return groups.map((ids, groupIndex) => {
    const group = inProgress[groupIndex]

    // None of the group's ids matched an activity with tiles -- nothing to draw
    if (!group) return {ids, added: [], clustered: [], coverage: []}

    // Tiles whose fourth neighbour became covered somewhere across the
    // group's span: mostly old ground, and the one count that shows a hole
    // closing, not an edge moving
    const clustered = getCluster(group.after).filter(
      distinctTiles(getCluster(group.before))
    )

    return {ids, added: group.added, clustered, coverage: group.after}
  })
}

module.exports = {getActivityCards}
