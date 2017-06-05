import _ from 'lodash'

function fetchByIdsDebounce() {
  if (this._fetchByIdsPromise) return this._fetchByIdsPromise

  const promises = _.values(this._fetchPromises)
  this._fetchByIdsPromise = Promise.all(promises)
    .then(() => {
      const ids = Object.keys(this._fetchIdTable)
      if (ids.length > 0) {
        const now = new Date()
        _.each(ids, id => (this._fetchTimes[id] = now))
        return this._doReload(ids)
      }
    })
    .then(() => (this._fetchByIdsPromise = null))
    .catch(() => (this._fetchByIdsPromise = null))
}

export default function batcher(func) {
  let argsArr = []
  let resolveArr = []
  let rejectArr = []

  function flush() {
    const _argsArr = argsArr
    const _resolveArr = resolveArr
    const _rejectArr = rejectArr
    argsArr = []
    resolveArr = []
    rejectArr = []

    return Promise.resolve(func(_argsArr))
      .then(retArr => {
        _.each(_resolveArr, (resolve, i) => resolve(retArr[i]))
        return retArr
      })
      .catch(err => {
        for (const reject of _rejectArr) {
          reject(err)
        }
        return Promise.reject(err)
      })
  }

  const _addFlush = _.debounce(flush)

  function enqueue(...args) {
    argsArr.push(args)

    const p = new Promise((resolve, reject) => {
      resolveArr.push(resolve)
      rejectArr.push(reject)
    })

    _addFlush()
    return p
  }

  // expose flush, so that can flush and wait manually
  enqueue.flush = flush

  return enqueue
}
