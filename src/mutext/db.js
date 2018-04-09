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

const createDb = config => {
  const getConfig = () => config

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
  let isStarted = false

  const db = {
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

        if (isStarted) _.each(subscribers, subscriber => subscriber(change, db))
      }
    },
    subscribe,
    getConfig,
  }

  // create collections
  const colls = _.mapValues(_.pickBy(config, _.isPlainObject), (conf, name) => createCollection(conf, name, db))
  Object.assign(db, colls)
  // init collections
  _.each(colls, (coll, name) => {
    if (coll.initState) coll = db[name] = mutateCollection(coll, coll.load(coll.initState, true))
    if (coll.onInit) coll.onInit(coll)
  })

  isStarted = true
  return db
}
export default createDb
