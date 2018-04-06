import shallowEqual from 'fbjs/lib/shallowEqual'

export const createBatchMemoize = ({ handler, onSuccess } = {}) => {
  let batchIndex = 0
  const lastProps = {}
  const results = {}
  const promises = {}

  const memoize = (inlineFunc, props, ...restArgs) => {
    const batchI = batchIndex
    batchIndex++

    if (shallowEqual(lastProps[batchI], props)) {
      return results[batchI]
    }
    lastProps[batchI] = props

    const promise = (inlineFunc || handler)(props, ...restArgs)
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

  memoize.results = results
  memoize.promises = promises
  memoize.newBatch = () => {
    batchIndex = 0
  }
  return memoize
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
