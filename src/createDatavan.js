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

export default function createDatavan({ getState, onChange, mixins = {} }) {
  const collections = {}
  const dv = { getState, onChange, mixins, collections }

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
    return Promise.all(promises).then(allPending)
  }

  function getCollection(name, { uniqId, mixin, dependencies } = {}) {
    let collection = collections[name]
    if (!collection) {
      // create dependencies
      _.each(dependencies, dependency => dependency(dv))

      // createCollection
      collection = collections[name] = Collection({ dv, name, uniqId }, [mixins[name], mixin])

      if (!dv[name]) dv[name] = collection
    } else if (uniqId && collection.uniqId && uniqId !== collection.uniqId) {
      console.error(`Datavan collection name ${name} crashed`)
    }
    return collection
  }

  return Object.assign(dv, {
    emit: Emitter(dv, onChange),

    getCollection,

    invalidate,
    allPending,

    setMixins: newMixins => Object.assign(mixins, newMixins),
  })
}
