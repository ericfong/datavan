import _ from 'lodash'

// reset both dirty and tidy docs
const _calcUnset = ({ gcTime }, timestamps, ids, expired) => {
  if (expired && gcTime > 0) {
    const unset = []
    const expiredAt = Date.now() - gcTime
    _.each(timestamps, (timestamp, id) => {
      if (timestamp <= expiredAt) unset.push(id)
    })
    return unset
  }
  return ids || Object.keys(timestamps)
}
export function reset(collection, { ids, expired = false, mutated = true } = {}) {
  const delByIds = _calcUnset(collection, collection._byIdAts, ids, expired)
  collection._byIdAts = _.omit(collection._byIdAts, delByIds)

  const mut = {}
  // if any change in byIds, clear all query cache
  if (delByIds.length > 0) {
    mut.fetchAts = { $set: {} }
  }

  // console.log(`>>> expired=${expired}, mutated=${mutated}`, delByIds)
  if (mutated) {
    if (expired) {
      const { originals } = collection.getState()
      const isTidy = id => !(id in originals)
      mut.byId = {
        $unset: _.filter(delByIds, isTidy),
      }
    } else {
      mut.byId = ids ? { $unset: delByIds } : { $set: {} }
      mut.originals = mut.byId
    }
  }
  collection.addMutation(mut)
}
