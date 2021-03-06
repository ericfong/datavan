import _ from 'lodash'
import shallowEqual from 'fbjs/lib/shallowEqual'

const touchCollectionFuncs = ['getLocalData', 'getFetchData']

export const createBatchMemoizer = onSuccess => {
  let batchIndex = 0
  const lastColls = {}
  const lastProps = {}
  const results = {}
  const promises = {}

  function memoize(inlineFunc, props, ...restArgs) {
    const batchI = batchIndex
    batchIndex++

    const db = this
    const lastColl = lastColls[batchI]
    const currColl = _.mapValues(lastColl, (oldColl, name) => db.getLocalData(name))
    const collEqual = shallowEqual(lastColl, currColl)

    // eslint-disable-next-line
    const propsEqual = lastProps.hasOwnProperty(batchI) && shallowEqual(lastProps[batchI], props)

    if (collEqual && propsEqual) return results[batchI]

    const touchNames = {}
    // db-with-memoize
    const dbWithWrappedFuncs = {
      ...db,
      // should include tryCache wrapped function
      ...touchCollectionFuncs.reduce((newDb, funcName) => {
        newDb[funcName] = (...args) => {
          // record touched name
          touchNames[args[0]] = true
          return db[funcName](...args)
        }
        return newDb
      }, {}),
    }
    const promise = inlineFunc(dbWithWrappedFuncs, props, ...restArgs)
    // console.log('>touchNames>>', touchNames)
    lastColls[batchI] = _.mapValues(touchNames, (v, name) => db.getLocalData(name))
    lastProps[batchI] = props

    let ret
    if (promise && promise.then) {
      promise.then(
        result => {
          results[batchI] = result
          delete promises[batchI]
          return onSuccess(result, batchI)
        },
        error => {
          delete promises[batchI]
          return Promise.reject(error)
        }
      )
      promises[batchI] = promise
    } else {
      ret = promise
    }
    return (results[batchI] = ret) // eslint-disable-line
  }

  return {
    results,
    promises,
    newBatch(db) {
      batchIndex = 0
      // make a db-with-memoize
      return {
        ...db,
        memoize,
      }
    },
  }
}

// const createAsyncCache = ({ handler, onSuccess, onError } = {}) => {
//   const results = {}
//   const promises = {}
//   const cache = (key, inlineFunc) => {
//     if (typeof key !== 'string') key = stringify(key)
//     if (key in results) return results[key]
//
//     const promise = (inlineFunc || handler)(key)
//     let ret
//     if (promise && promise.then) {
//       promise.then(
//         result => {
//           results[key] = result
//           delete promises[key]
//           return onSuccess(result, key)
//         },
//         error => {
//           promises[key] = error
//           return onError(error, key)
//         }
//       )
//       promises[key] = promise
//     } else {
//       ret = promise
//     }
//     return (results[key] = ret) // eslint-disable-line
//   }
//   cache.results = results
//   cache.promises = promises
//   return cache
// }
