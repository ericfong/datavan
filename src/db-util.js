import _ from 'lodash'
import createDb from './db'

const parentDataMutation = ['preloads', 'fetchAts', 'fetchingAt', '_fetchResults', '_byIdAts']

export const forkDb = parentDb => {
  const confs = parentDb.getConfig()
  const subDb = createDb(confs)

  // copy submits and originals
  _.each(confs, (conf, name) => {
    subDb[name].submits = { ...parentDb[name].submits }
    subDb[name].originals = { ...parentDb[name].originals }
  })

  let shouldEmitParentChange = true

  // subscribe parent change to child db change
  parentDb.subscribe(parentChange => {
    if (shouldEmitParentChange) {
      // re-emit parent change event by ...
      const subChange = _.mapValues(parentChange, (coll, name) =>
        // create new instance and clear _cache
        ({ ...subDb[name], _cache: {} })
      )
      Object.assign(subDb, subChange)
      subDb.emit(subChange)
    }
  })

  return Object.assign(subDb, {
    getParent: () => parentDb,

    getFetchData(name) {
      return parentDb.getDb()[name]
    },

    dispatchFilter(mutSpecs) {
      const parentMuts = []
      const newSpecs = _.map(mutSpecs, mutSpec => {
        const { name, mutation } = mutSpec
        // TODO separate/handle $merge, $toggle, $unset
        if (parentDataMutation.find(key => mutation[key])) {
          parentMuts.push({ name, mutation: _.pick(mutation, parentDataMutation) })
          return { name, mutation: _.omit(mutation, parentDataMutation) }
        }
        return mutSpec
      })
      if (parentMuts.length > 0) {
        shouldEmitParentChange = false
        parentDb.dispatch(parentMuts)
        shouldEmitParentChange = true
      }
      return newSpecs
    },
  })
}
