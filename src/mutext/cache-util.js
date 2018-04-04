import { shallowEqual } from 'recompose'

export const createAsyncCache = ({ handler, onSuccess, onError } = {}) => {
  let batchIndex = 0
  const lastProps = {}
  const results = {}
  const promises = {}
  const cache = (props, inlineFunc) => {
    const callIndex = batchIndex
    batchIndex++

    if (shallowEqual(lastProps[callIndex], props)) {
      return results[callIndex]
    }

    const promise = (inlineFunc || handler)(props)
    let ret
    if (promise && promise.then) {
      promise.then(
        result => {
          results[callIndex] = result
          delete promises[callIndex]
          return onSuccess(result, callIndex)
        },
        error => {
          promises[callIndex] = error
          return onError(error, callIndex)
        }
      )
      promises[callIndex] = promise
    } else {
      ret = promise
    }
    return (results[callIndex] = ret) // eslint-disable-line
  }
  cache.results = results
  cache.promises = promises
  cache.newBatch = () => {
    batchIndex = 0
  }
  return cache
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
