
function normalizePromise(func) {
  try {
    return Promise.resolve(func())
  } catch (err) {
    return Promise.reject(err)
  }
}

export default function debouncePromise(promiseTable, uniqKey, next, thenCallback, isReplace) {
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
