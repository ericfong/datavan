import _ from 'lodash'
import invariant from 'invariant'

import {debouncePromise} from './promiseUtil'
import {calcCacheKey} from './memoizeUtil'


export default loaders => Base => {
  class SideLoad extends Base {
    // flush that into iso data?
    _loadingPromises = {}
    _loadedTimes = {}

    // TODO convert getState to find without params?

    // TODO if get, combine get id and call find?
    get(id, option) {
      if (loaders.get && id && !this.isLocalId(id)) {
        checkLoad(this, loaders.get, loaders.getKey, id, option)
      }
      return super.get(id, option)
    }

    getPromise() {
      const promises = _.values(this._loadingPromises)
      const superPromise = super.getPromise && super.getPromise()
      if (superPromise) promises.push(superPromise)
      return promises.length > 0 ? Promise.all(promises) : null
    }
  }

  // TODO refactor
  _.each(_.omit(loaders, 'get'), (loader, name) => {
    if (typeof loader === 'function') {
      invariant(_.includes(['get', 'find', 'search', 'getState'], name), `You should not wrap loader on ${name}. Please wrap loader on get, find, search, getState`)

      SideLoad.prototype[name] = createSideLoadFunc(Base.prototype[name], loader, loaders[name + 'Key'])
    // } else {
    //   SideLoad.prototype[name] = loader
    }
  })

  return SideLoad
}


const possibleModes = ['load', 'reload', 'preload', 'local']

function shouldReload(collection, cacheKey, option) {
  const opt = option || {}
  const {reload, serverPreload} = opt
  if (reload || serverPreload) console.error('Please use sideLoad param')

  // expect option.load is string or true
  const mode = opt.load === true ? 'load' : opt.load
  if (mode && !_.includes(possibleModes, mode)) {
    console.error(`Unknown load=${mode}`)
  }

  if (mode === 'local') {
    return
  }

  const _loadedTimes = collection._loadedTimes
  const loadedTime = _loadedTimes[cacheKey]
  const {ifModifiedSince, duringServerPreload} = collection.getContext()

  // when isServerPreloading, only load resource that is preload and preload only one time
  if (duringServerPreload && mode === 'preload' && loadedTime) {
    return
  }

  if (mode === 'reload') {
    return {returnPromise: true}
  }

  // check and call load again (reget.put and reget.post will also clean loadedTime and trigger load again)
  if (loadedTime && (!ifModifiedSince || ifModifiedSince < loadedTime)) {
    return
  }

  return {returnPromise: mode === 'load'}
}


function checkLoad(collection, loader, keyGetter, query, option) {
  const cacheKey = calcCacheKey([query, option], keyGetter)
  const match = shouldReload(collection, cacheKey, option)
  if (match) {
    const {returnPromise} = match
    const _loadingPromises = collection._loadingPromises
    const promise = debouncePromise(_loadingPromises, cacheKey, () => {
      return loader.call(collection, query, option)
    }, ret => {
      const now = new Date()
      collection._loadedTimes[cacheKey] = now

      const idField = collection.idField

      // TODO handle collection.get(null or undefined) which null and undefined is user input
      if (Array.isArray(ret) || query === null || query === undefined || typeof query === 'object') {
        const mutation = {}
        _.each(ret, doc => {
          const id = doc[idField]
          collection._loadedTimes[id] = new Date()
          mutation[id] = { $set: doc }
        })
        collection.mutateState(mutation)
      } else {
        const id = ret[idField]
        collection.mutateState({ [id]: { $set: ret } })
      }

      return ret
    })

    if (returnPromise || promise.isNormalizedPromise) {
      return promise
    }
  }
}


function createSideLoadFunc(baseFunc, loader, keyGetter) {
  return function sideLoadFunc(query, option) {
    const promise = checkLoad(this, loader, keyGetter, query, option)
    if (promise) {
      // is sync value (normalized into promise like interface)
      // OR force returnPromise
      return promise.isNormalizedPromise ? promise.value : promise
    }

    return baseFunc.call(this, query, option)
  }
}
