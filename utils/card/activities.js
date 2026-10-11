const {getCluster, distinctTiles} = require("../tiles")

// What each card in `groups` needs, from one walk of the whole history.
// `activities` is `{id, start_date, tiles}` for every activity. A group is
// an array of ids (several for a multi-day trip), drawn as one activity
// spanning from its first member to its last.
function getActivityCards({activities, groups}) {
  // Ids can be numbers or strings
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

    // Overwritten per member, so it ends as the state after the last one
    if (groupIndex !== undefined) {
      inProgress[groupIndex].after = [...coverage]
    }
  })

  return groups.map((ids, groupIndex) => {
    const group = inProgress[groupIndex]

    // None of the group's ids matched an activity with tiles -- nothing to draw
    if (!group) return {ids, added: [], clustered: [], coverage: []}

    // Tiles closed in during the group's span
    const clustered = getCluster(group.after).filter(
      distinctTiles(getCluster(group.before))
    )

    return {ids, added: group.added, clustered, coverage: group.after}
  })
}

module.exports = {getActivityCards}
