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

const createDb = (confs, enhancer) => {
  let db = {
    loadCollections(datas) {
      const action = _.mapValues(datas, (data, name) => {
        const coll = db[name]
        return coll ? coll.load(data, true) : {}
      })
      db.dispatch(action)
    },

    getState() {
      return db
    },

    dispatch(action) {
      // TODO prepare for batch reduce?
      const change = reduce(db, action)
      if (Object.keys(change).length > 0) {
        Object.assign(db, change)
        if (db.onChange) db.onChange(change, db)
      }
    },
  }
  _.each(confs, (conf, name) => {
    if (typeof conf === 'object') {
      db[name] = createCollection(conf, name, db)
    }
  })
  if (enhancer) db = enhancer(db)
  return db
}
export default createDb
