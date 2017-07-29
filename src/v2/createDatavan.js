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

export default function createDatavan({ getState, onChange, adapters = {} }) {
  const collections = {}

  function invalidate(query) {
    _.each(collections, coll => coll.invalidate && coll.invalidate(query))
  }
  // function autoInvalidate({ collections }) {
  //   _.each(collections, coll => coll.autoInvalidate && coll.autoInvalidate())
  // }

  const dv = { getState, onChange, adapters, collections, invalidate }

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
  })
}
