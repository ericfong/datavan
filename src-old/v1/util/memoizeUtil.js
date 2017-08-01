import stringfy from 'fast-stable-stringify'

function defaultStatesGetter() {
  return []
}
function defaultKeyGetter(firstArg) {
  return typeof rawKey === 'object' ? stringfy(firstArg) : firstArg
}
function defaultEqualityCheck(a, b) {
  return a === b
}

// only Collection.js using this
export function stateMemoizeTable(func, statesGetter = defaultStatesGetter, keyGetter = defaultKeyGetter, equalityCheck = defaultEqualityCheck) {
  let lastStates = null
  const isEqualToLastState = (value, index) => equalityCheck(value, lastStates[index])

  function memoizedFunc(...args) {
    // states based on this / config or other context
    // must return states array
    const states = statesGetter()
    // if (!Array.isArray(states)) states = [states]

    // key based on args and should be serizeable
    const cacheKey = keyGetter(...args)

    let memoryTable = memoizedFunc.memory
    if (lastStates === null || lastStates.length !== states.length || !states.every(isEqualToLastState)) {
      // if any states changed, clean all caches
      memoryTable = memoizedFunc.memory = {}
    }
    lastStates = states

    // return cache if exists
    const lastResult = memoryTable[cacheKey]
    if (lastResult) return lastResult

    // gen new result and put into cache
    return (memoryTable[cacheKey] = func(...states, ...args))
  }

  return memoizedFunc
}
