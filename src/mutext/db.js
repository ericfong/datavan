import _ from 'lodash'

import collectionCore from './collectionCore'
import collectionRead from './collectionRead'
import collectionWrite from './collectionWrite'
import { mutateUtil, checkCastById } from './collection-util'

const mutateCollection = (prev, mutation) => {
  const next = mutateUtil(prev, mutation)
  if (next !== prev) {
    next._cache = {}

    if (next.cast) {
      checkCastById('submits', next, prev, mutation)
      checkCastById('preloads', next, prev, mutation)
    }

    return next
  }
  return next
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
  let canEmit = false

  const db = {
    ...collectionCore,
    ...collectionRead,
    ...collectionWrite,

    dispatch(mutations) {
      const change = {}
      let hasChange = false
      canEmit = false

      // normalize
      if (!Array.isArray(mutations)) {
        const _mutSpecs = []
        _.each(mutations, (mutation, name) => {
          if (Array.isArray(mutation)) {
            _.each(mutation, m => _mutSpecs.push({ name, mutation: m }))
          } else {
            _mutSpecs.push({ name, mutation })
          }
        })
        mutations = _mutSpecs
      }

      // hook
      if (db.dispatchFilter) mutations = db.dispatchFilter(mutations)

      // do change
      _.each(mutations, ({ name, mutation }) => {
        const prev = db[name]
        const next = mutateCollection(prev, mutation)
        if (next !== prev) {
          db[name] = change[name] = next
          hasChange = true
        }
      })

      canEmit = true
      // assign change to db and fire to subscribers
      if (hasChange) db.emit(change)
    },
    subscribe,
    emit(change) {
      if (canEmit) _.each(subscribers, subscriber => subscriber(change))
    },

    getConfig: () => config,
    getLatestDb: () => db,
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
    if (coll.initState) db.load(name, coll.initState)
    if (coll.onInit) coll.onInit(coll)
  })

  canEmit = true
  return db
}
export default createDb
