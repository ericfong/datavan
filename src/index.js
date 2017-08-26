import table from './table'

export { table }

export datavanEnhancer, { datavanReducer } from './enhancer'

// store
export { setOverrides, invalidateStore, getStorePending, serverPreload } from './store'

// utils
export createVan from './van'
export getSetters from './util/getSetters'
export onFetchById from './util/onFetchById'
export { getQueryIds } from './core/finder'

// plugins
export plugAssign from './plug/assign'
export plugBrowser from './plug/browser'
export plugCookie from './plug/cookie'
export plugKoaCookie from './plug/koaCookie'
export plugSearchable, { search } from './plug/searchable'
export plugLocalStorage from './plug/localStorage'

// interface
export { getState, getAll } from './state'
export { setAll, set, del, insert, update, remove } from './setter'
export { isDirty, getSubmits, reset, submit } from './submitter'
export { find, findAsync, get, getAsync, findOne, allPendings } from './fetcher'

export const defineCollection = spec => {
  if (typeof spec === 'string') {
    throw new Error(
      `Use defineCollection({ name: '${spec}' }) instead of efineCollection('${spec}'). Please use object as spec directly instead of defineCollection`
    )
    // } else {
    //   console.warn('Please use object as spec directly instead of defineCollection')
  }
  return state => table(state, spec)
}
