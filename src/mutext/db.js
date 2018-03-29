import _ from 'lodash'

import createCollection from './collection'
import { mutateCollection } from './collection-util'

const reduce = (prevState, totalMutation) => {
  const change = {}
  _.mapValues(totalMutation, (mutation, name) => {
    const prev = prevState[name]
    const next = mutateCollection(prev, mutation)
    if (next !== prev) {
      change[name] = next
    }
  })
  return change
}

const createDb = (confs, initState) => {
  const db = {
    loadCollections(datas) {
      const action = _.mapValues(datas, (data, name) => {
        const coll = db[name]
        return coll ? coll.load(data, true) : {}
      })
      this.dispatch(action)
    },

    getState: () => db,
    dispatch: action => {
      const change = reduce(db, action)
      if (Object.keys(change).length > 0) {
        Object.assign(db, change)
        if (confs.onChange) confs.onChange(db, change)
      }
    },
    ...initState,
  }
  _.each(confs, (conf, name) => {
    if (typeof conf === 'object') {
      db[name] = createCollection(conf, name, db, db[name])
    }
  })
  return db
}
export default createDb
