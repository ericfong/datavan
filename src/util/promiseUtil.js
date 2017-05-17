// class SyncResultPromise {
//   isSyncResultPromise = true
//
//   constructor(result, error) {
//     this.result = result
//     this.error = error
//   }
//
//   getResult() {
//     return this.result
//   }
//
//   getError() {
//     return this.error
//   }
//
//   then(onFulfilled, onRejected) {
//     if (onRejected && this.error) {
//       this.result = onRejected(this.error)
//     } else if (onFulfilled) {
//       this.result = onFulfilled(this.result)
//     }
//     return this
//   }
//
//   catch(onRejected) {
//     if (onRejected && this.error) {
//       this.result = onRejected(this.error)
//     }
//     return this
//   }
// }
// export function isSyncResultPromise(p) {
//   return p.isSyncResultPromise
// }

// only FetchingCollection.js using this
export function isThenable(p) {
  return p && !!p.then
}

// Fetching, Submitting, Collection using
export function syncOrThen(result, onFulfilled, onRejected) {
  if (isThenable(result)) {
    return result.then(onFulfilled, onRejected)
  } else {
    try {
      return onFulfilled(result)
    } catch (err) {
      return onRejected(err)
    }
  }
}
