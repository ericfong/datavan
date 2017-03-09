import _ from 'lodash'
// import invariant from 'invariant'

import {debouncePromise} from './util/promiseUtil'
import {calcCacheKey} from './util/memoizeUtil'
import batcher from './util/batcher'


export default Base => {
  return class Fetcher extends Base {
    // flush that into iso data?
    _loadingPromises = {}
    _loadedTimes = {}

    find(query, option) {
      if (this.findFetch) {
        const cacheKey = calcCacheKey([query, option], this.findFetchKey)
        return checkLoad(this, super.find, this.findFetch, cacheKey, query, option)
      }
      return super.find(query, option)
    }

    _getFetchViaFind = batcher(argsArr => {
      const ids = _.uniq(_.map(argsArr, 0))
      // how to handle array of options?
      return Promise.resolve(this.findFetch({ [this.idField]: {$in: ids} }))
      .then(rets => {
        const retTable = _.keyBy(rets, this.idField)
        return _.map(argsArr, ([id]) => retTable[id])
      })
    })

    get(id, option) {
      if (id && !this.isLocalId(id)) {
        const getFetch = this.getFetch || (this.findFetch && this._getFetchViaFind)
        if (getFetch) {
          return checkLoad(this, super.get, getFetch, id, id, option)
        }
      }
      return super.get(id, option)
    }

    searchFetch(text, option) {
      if (!this.findFetch) return undefined
      return this.findFetch({$search: text}, option)
    }

    search(text, option) {
      if (text) {
        return checkLoad(this, super.search, this.searchFetch, text, text, option)
      }
      return super.search(text, option)
    }

    getPromise() {
      const promises = _.values(this._loadingPromises)
      const superPromise = super.getPromise && super.getPromise()
      if (superPromise) promises.push(superPromise)
      return promises.length > 0 ? Promise.all(promises) : null
    }
  }
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
  const {ifModifiedSince, duringServerPreload} = collection._store.getContext()

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

function doReload(collection, fetcherFunc, query, option, cacheKey) {
  const _loadingPromises = collection._loadingPromises
  return debouncePromise(_loadingPromises, cacheKey,
    () => fetcherFunc.call(collection, query, option),
    ret => {
      if (ret === undefined) {
        return undefined
      }

      const now = new Date()
      collection._loadedTimes[cacheKey] = now

      const idField = collection.idField

      if (Array.isArray(ret) || query === null || query === undefined || typeof query === 'object') {
        const mutation = {}
        _.each(ret, _doc => {
          const doc = collection.cast(_doc)
          const id = doc[idField]
          collection._loadedTimes[id] = new Date()
          mutation[id] = { $set: doc }
        })
        collection.mutateState(mutation)
      } else {
        const doc = collection.cast(ret)
        const id = doc[idField]
        collection.mutateState({ [id]: { $set: doc } })
      }

      return ret
    }
  )
}

function checkLoad(collection, baseFunc, fetcherFunc, cacheKey, query, option) {
  const match = shouldReload(collection, cacheKey, option)
  if (match) {
    const promise = doReload(collection, fetcherFunc, query, option, cacheKey)

    // is sync value (normalized into promise like interface)
    if (promise.isNormalizedPromise) {
      if (promise.value !== undefined) {
        return promise.value
      }
    } else if (match.returnPromise) {
      // always use local way to query and sort data
      return promise.then(() => baseFunc.call(collection, query, option))
    }
  }

  return baseFunc.call(collection, query, option)
}
