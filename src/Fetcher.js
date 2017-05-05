import _ from 'lodash'

import {calcCacheKey} from './util/memoizeUtil'
import batcher from './util/batcher'
import {normalizePromise} from './util/promiseUtil'


export default Base => {
  return class Fetcher extends Base {
    // flush that into iso data?
    _fetchPromises = {}
    _fetchTimes = {}
    findFetchIsAsync = false

    find(query, option) {
      if (this.findFetch) {
        const cacheKey = calcCacheKey([query, option], this.findFetchKey)
        return checkLoad(this, query, option, {
          baseFunc: super.find,
          fetcherFunc: this.findFetch,
          responseType: 'collection',
          cacheKey,
        })
      }
      return super.find(query, option)
    }

    findFetchKey(query, option) {
      return [query, _.pick(option, 'sort', 'skip', 'limit', 'keyBy', 'groupBy')]
    }

    _getFetchViaFind = batcher(argsArr => {
      const allIds = _.map(argsArr, 0)
      const ids = _.uniq(allIds)
      // how to handle array of options?
      const p = this.find({ [this.idField]: {$in: ids} }, {load: 'load'})
      return normalizePromise(p)
      .then(rets => {
        const retTable = _.keyBy(rets, this.idField)
        return _.map(allIds, id => retTable[id])
      })
    })
    _fetchOneViaFind(id, option) {
      return normalizePromise(this.find({ [this.idField]: id }, {...option, load: 'load'}))
      .then(rets => _.first(rets))
    }
    getFetchViaFind(id, option) {
      return this.findFetchIsAsync ? this._fetchOneViaFind(id, option) : this._getFetchViaFind(id, option)
    }

    get(id, option) {
      if (id && !this.isLocalId(id)) {
        const fetcherFunc = this.findFetch && this.getFetchViaFind
        if (fetcherFunc) {
          return checkLoad(this, id, option, {
            baseFunc: super.get,
            fetcherFunc,
            responseType: 'document',
            cacheKey: id,
          })
        }
      }
      return super.get(id, option)
    }

    getPromise() {
      const promises = _.values(this._fetchPromises)
      const superPromise = super.getPromise && super.getPromise()
      if (superPromise) promises.push(superPromise)
      return promises.length > 0 ? Promise.all(promises) : null
    }

    isFetching() {
      return !_.isEmpty(this._fetchPromises)
    }

    invalidate() {
      if (super.invalidate) super.invalidate()
      this._fetchTimes = {}
      // TODO correct local ids
      // TODO Fetcher should combine with Stage, so no local changes will go to Fetcher wrapping collection
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

  const _fetchTimes = collection._fetchTimes
  const loadedTime = _fetchTimes[cacheKey]
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


function debouncePromise(promiseTable, uniqKey, next, thenCallback) {
  const oldPromise = promiseTable[uniqKey]
  if (oldPromise) return oldPromise

  const p = normalizePromise(next)
  .then(ret => {
    delete promiseTable[uniqKey]
    return ret
  })
  .catch(err => {
    delete promiseTable[uniqKey]
    if (__DEV__) console.error(err)
    return Promise.reject(err)
  })
  .then(thenCallback)

  return promiseTable[uniqKey] = p
}


function doReload(collection, query, option, {fetcherFunc, cacheKey, responseType}) {
  return debouncePromise(collection._fetchPromises, cacheKey,
    () => fetcherFunc.call(collection, query, option),
    ret => {
      collection._fetchTimes[cacheKey] = new Date()

      const idField = collection.idField

      if (responseType === 'collection') {
        if (_.isEmpty(ret)) {
          // force state change to ensure component known loading is done, but just load nothing
          // TODO better to dispatch a event ?
          collection._store.mutateState({ [collection.name]: { $set: {...collection.getState()} } })
        } else {
          const mutation = {}
          _.each(ret, _doc => {
            const doc = collection.cast(_doc)
            const id = doc[idField]
            collection._fetchTimes[id] = new Date()
            mutation[id] = { $set: doc }
          })
          collection._store.mutateState({ [collection.name]: mutation })
        }
      } else if (ret) {
        // TODO may not have this anymore
        const doc = collection.cast(ret)
        const id = doc[idField]
        collection._store.mutateState({ [collection.name]: { [id]: { $set: doc } } })
      }

      return ret
    }
  )
}

function checkLoad(collection, query, option, {baseFunc, fetcherFunc, responseType, cacheKey}) {
  const match = shouldReload(collection, cacheKey, option)
  if (match) {
    const promise = doReload(collection, query, option, {fetcherFunc, cacheKey, responseType})

    if (match.returnPromise) {
      // TODO compare some local ids are removed from backend?
      return promise.then(() => baseFunc.call(collection, query, option))
    }
  }

  return baseFunc.call(collection, query, option)
}
