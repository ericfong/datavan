import _ from 'lodash'
import Collection from './Collection'

function takeMutation(dv) {
  return _.pickBy(_.mapValues(dv.collections, coll => coll.takeMutation()))
}

// @auto-fold here
function Emitter(dv, onChange) {
  function emitFlush() {
    const m = takeMutation(dv)
    if (!_.isEmpty(m)) onChange(m)
    dv.emitPromise = null
  }
  return function emit(flush) {
    if (flush) return emitFlush()
    if (dv.emitPromise) return dv.emitPromise
    const curP = (dv.emitPromise = new Promise(resolve =>
      setTimeout(() => {
        if (curP === dv.emitPromise) emitFlush()
        resolve()
      })
    ))
    return curP
  }
}

export function serverPreload(store, renderCallback) {
  const dv = store.datavan()
  dv.duringServerPreload = true

  const output = renderCallback()

  // recursive serverRender & promise.then
  const promise = dv.allPending(dv)
  if (promise) {
    return promise.then(() => serverPreload(store, renderCallback))
  }

  dv.duringServerPreload = false
  return output
}

export default function createDatavan({ getState, onChange, adapters = {} }) {
  const collections = {}
  const dv = { getState, onChange, adapters, collections }

  function invalidate(query) {
    _.each(collections, coll => coll.invalidate && coll.invalidate(query))
  }
  // function autoInvalidate({ collections }) {
  //   _.each(collections, coll => coll.autoInvalidate && coll.autoInvalidate())
  // }

  function allPending() {
    const { emitPromise } = dv
    const promises = _.compact(_.flatMap(collections, collection => collection.allPendings && collection.allPendings()))
    if (emitPromise) promises.push(emitPromise)
    if (promises.length <= 0) return null
    // TODO timeout or have a limit for recursive wait for promise
    return Promise.all(promises).then(() => allPending(dv))
  }

  return Object.assign(dv, {
    emit: Emitter(dv, onChange),

    getCollection(name, uniqId, readonly) {
      let collection = collections[name]
      if (!collection) {
        // createCollection
        collection = collections[name] = Collection({ dv, name, uniqId }, adapters[name])

        if (!dv[name]) dv[name] = collection
      } else if (uniqId && collection.uniqId && uniqId !== collection.uniqId) {
        console.error(`Datavan collection name ${name} crashed`)
      }
      return collection
    },

    invalidate,
    allPending,
  })
}
