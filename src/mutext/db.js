import _ from 'lodash'

import collectionCore from './collectionCore'
import collectionRead from './collectionRead'
import collectionWrite from './collectionWrite'
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
    ...collectionCore,
    ...collectionRead,
    ...collectionWrite,

    dispatch(action) {
      // TODO prepare for batch reduce?
      const change = reduce(db, action)
      if (Object.keys(change).length > 0) {
        Object.assign(db, change)

        if (isStarted) _.each(subscribers, subscriber => subscriber(change, db))
      }
    },
    subscribe,

    getConfig: () => config,
  }

  // create collections
  const colls = _.mapValues(_.pickBy(config, _.isPlainObject), (conf, name) => ({
    // local persist
    submits: {},
    originals: {},
    // local memory
    _cache: {},

    // fetch persist
    preloads: {},
    fetchAts: {},
    // fetch memory
    fetchingAt: null,
    _fetchResults: {},
    _fetchPromises: {},
    _byIdAts: {},

    TYPE: 'Collection',
    idField: '_id',
    name,
    getDb: () => db,
    ...conf,
  }))
  Object.assign(db, colls)

  // init collections
  _.each(colls, (coll, name) => {
    if (coll.initState) coll = db[name] = mutateCollection(coll, db.load(name, coll.initState, true))
    if (coll.onInit) coll.onInit(coll)
  })

  isStarted = true
  return db
}
export default createDb
