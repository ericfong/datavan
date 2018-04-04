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
  const getConfig = () => confs

  const subscribers = []
  const subscribe = subscriber => {
    subscribers.push(subscriber)
    let isSubscribed = true
    return function unsubscribe() {
      if (!isSubscribed) return false
      isSubscribed = false
      subscribers.splice(subscribers.indexOf(subscriber), 1)
      return true
    }
  }

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

        for (let i = 0, ii = subscribers.length; i < ii; i++) {
          subscribers[i](change, db)
        }
      }
    },
    subscribe,
    getConfig,
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
