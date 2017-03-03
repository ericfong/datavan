import jsonStableStringfy from 'json-stable-stringify'


function defaultStatesGetter() {
  return []
}
function defaultKeyGetter(firstArg) {
  return firstArg
}
function defaultEqualityCheck(a, b) {
  return a === b
}

export function calcCacheKey(args, keyGetter = defaultKeyGetter) {
  const rawKey = keyGetter(...args)
  return typeof rawKey === 'object' ? jsonStableStringfy(rawKey) : rawKey
}

export default function createMemoize(func, statesGetter = defaultStatesGetter, keyGetter, equalityCheck = defaultEqualityCheck) {
  let lastStates = null
  const isEqualToLastState = (value, index) => equalityCheck(value, lastStates[index])
  function memoizedFunc(...args) {
    let memory = memoizedFunc.memory
    // states based on this / config or other context
    let states = statesGetter()
    if (!Array.isArray(states)) {
      states = [states]
    }
    if (
      lastStates === null ||
      lastStates.length !== states.length ||
      !states.every(isEqualToLastState)
    ) {
      // if any states changed, clean all caches
      memory = memoizedFunc.memory = {}
    }
    lastStates = states

    // key based on args and should be serizeable
    const cacheKey = calcCacheKey(args, keyGetter)
    let lastResult = memory[cacheKey]
    if (!lastResult) {
      lastResult = memory[cacheKey] = func(...states, ...args)
    }
    return lastResult
  }
  return memoizedFunc
}
