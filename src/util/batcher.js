import _ from 'lodash'

export function createStandalonePromise() {
  let resolve
  let reject
  const p = new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  p.resolve = resolve
  p.reject = reject
  return p
}

export default function batcher(cb) {
  let argsArr = []
  let promises = []

  function flush() {
    const _argsArr = argsArr
    const _promises = promises
    argsArr = []
    promises = []

    return Promise.resolve(cb(_argsArr))
      .then(retArr => {
        _.each(_promises, (p, i) => p.resolve(retArr[i]))
        return retArr
      })
      .catch(err => {
        _.each(_promises, p => p.reject(err))
        return Promise.reject(err)
      })
  }

  const _addFlush = _.debounce(flush)

  function enqueue(...args) {
    argsArr.push(args)

    const p = createStandalonePromise()
    promises.push(p)

    _addFlush()
    return p
  }

  // expose flush, so that can flush and wait manually
  enqueue.flush = flush

  return enqueue
}

// function _runNext(funcs, i, args) {
//   const func = funcs[i]
//   if (!func) return
//   return func(...args, (...nextArgs) => _runNext(funcs, i + 1, nextArgs.length > 0 ? nextArgs : args))
// }
// export function joinMiddlewares(...funcs) {
//   return (...args) => _runNext(funcs, 0, args)
// }

// function fetchByIdsDebounce() {
//   if (this._fetchByIdsPromise) return this._fetchByIdsPromise
//
//   const promises = _.values(this._fetchPromises)
//   this._fetchByIdsPromise = Promise.all(promises)
//     .then(() => {
//       const ids = Object.keys(this._fetchIdTable)
//       if (ids.length > 0) {
//         const now = new Date()
//         _.each(ids, id => (this._fetchTimes[id] = now))
//         return this._doReload(ids)
//       }
//     })
//     .then(() => (this._fetchByIdsPromise = null))
//     .catch(() => (this._fetchByIdsPromise = null))
// }
// export function makeBatchIdQuery() {
//   const batch = batcher(argsArr => {
//     const next = _.last(_.last(argsArr))
//     const ids = _.flatten(_.map(argsArr, args => args[0]))
//     return next(ids)
//   })
//   return (query, option, next) => {
//     if (Array.isArray(query)) {
//       return batch(query, option, next)
//     }
//     return next()
//   }
// }
