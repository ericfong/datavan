
export class NormalizedPromise {
  isNormalizedPromise = true

  constructor(value, error) {
    this.value = value
    this.error = error
  }

  then(onFulfilled, onRejected) {
    if (onRejected && this.error) {
      this.value = onRejected(this.error)
    } else if (onFulfilled) {
      this.value = onFulfilled(this.value)
    }
    return this
  }

  catch(onRejected) {
    if (onRejected && this.error) {
      this.value = onRejected(this.error)
    }
    return this
  }
}

export function isThenable(p) {
  return p && p.then
}

export function isNormalizedPromise(p) {
  return p.isNormalizedPromise
}

export function normalizePromise(func) {
  try {
    const p = func()
    if (isThenable(p)) {
      return p
    } else {
      return new NormalizedPromise(p)
    }
  } catch (err) {
    return Promise.reject(err)
  }
}

export function debouncePromise(promiseTable, uniqKey, next, thenCallback, isReplace) {
  const oldPromise = promiseTable[uniqKey]
  if (!isReplace && oldPromise) return oldPromise

  const p = normalizePromise(next)
  promiseTable[uniqKey] = p
  if (thenCallback) {
    p.then(ret => {
      if (p === promiseTable[uniqKey]) {
        try {
          return thenCallback(ret)
        } catch(err) {
          delete promiseTable[uniqKey]
          if (__DEV__) console.error(err)
          return Promise.reject(err)
        }
      }
      return ret
    })
  }
  p.then(ret => {
    if (p === promiseTable[uniqKey]) {
      delete promiseTable[uniqKey]
    }
    return ret
  })
  .catch(err => {
    if (p === promiseTable[uniqKey]) {
      delete promiseTable[uniqKey]
    }
    return Promise.reject(err)
  })
  return p
}

export default normalizePromise
