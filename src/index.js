import table from './table'

// import { getState, getAll } from './state'
// import { setAll, set as _set, del as _del, insert as _insert, update as _update, remove as _remove } from './setter'
// import { isDirty, getSubmits as _getSubmits, invalidate as _invalidate, reset as _reset, submit } from './submitter'
// import { find as _find, findAsync as _findAsync, get as _get, getAsync as _getAsync, findOne as _findOne, allPendings } from './fetcher'
// // interface
// const isCore = core => '_pendingState' in core
// const wrap = func => (state, spec, ...args) => {
//   if (isCore(state)) return func(state, spec, ...args)
//   return func(table(state, spec), ...args)
// }
// export const set = wrap(_set)
// export const del = wrap(_del)
// export const insert = wrap(_insert)
// export const update = wrap(_update)
// export const remove = wrap(_remove)
// export const getSubmits = wrap(_getSubmits)
// export const invalidate = wrap(_invalidate)
// export const reset = wrap(_reset)
// export const find = wrap(_find)
// export const findAsync = wrap(_findAsync)
// export const get = wrap(_get)
// export const getAsync = wrap(_getAsync)
// export const findOne = wrap(_findOne)
// export { getState, getAll, setAll, allPendings, submit, isDirty }

export { table }

export datavanEnhancer, { datavanReducer } from './redux'

// store
export { setOverrides, invalidateStore, getStorePending, serverPreload, setContext, getContext, forceEmitFlush } from './store'

// utils
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

export const defineCollection = (spec, oldSpec, dependencies) => {
  if (typeof spec === 'string') {
    const _spec = { name: spec, ...oldSpec, dependencies }
    return state => table(state, _spec)
    // throw new Error(
    //   `Use defineCollection({ name: '${spec}' }) instead of efineCollection('${spec}'). Please use object as spec directly instead of defineCollection`
    // )
  }
  return state => table(state, spec)
}
