export default function Find(conf, preparedFunc) {
  function find(state, query, option) {
    // mix state and meta
    const { table, requests } = getState(conf, state)
    const context = getContext(conf, state)

    if (conf.onFetch) {
      if (checkOption(context, option)) {
        const { fetchQuery, fetchKey } = tryGetFetchQueryKey(this, query, option)
        if (fetchKey !== false) {
          const p = _fetch(this, fetchQuery, option, fetchKey)
          addFetchingPromise(this._fetchingPromises, fetchKey, p)
        }
      }
    }
    return findMemory(this, query, option)
  }

  if (preparedFunc) {
    return reselect(preparedFunc, find)
  }

  return find
}
