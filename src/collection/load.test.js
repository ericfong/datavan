import _ from 'lodash'
import { createStore } from 'redux'
import delay from 'delay'

import { createCollection, defineCollection, datavanEnhancer, getState, getAll, get, find, set, loadCollections, allPendings } from '..'
import { load, loadAsDefaults } from './load'
import onFetchEcho from '../test/onFetchEcho'

test('save&load will not re-fetch by ids', async () => {
  // get serverUsers state
  const onFetch = jest.fn(onFetchEcho)
  const serverUsers = createCollection({ onFetch })
  find(serverUsers, ['a', 'b', 'c'])
  find(serverUsers, { name: 'A' })
  await Promise.all(allPendings(serverUsers))
  const serverState = getState(serverUsers)

  // new browser collection
  const users = createCollection({ onFetch, initState: serverState })
  expect(getState(users).byId).toEqual({ a: { _id: 'a', name: 'A' }, b: { _id: 'b', name: 'B' }, c: { _id: 'c', name: 'C' } })
  expect(_.keys(getState(users).fetchAts)).toEqual(['[["a","b","c"],{}]', '[{"name":"A"},{}]'])
  expect(_.keys(users._byIdAts)).toEqual(['a', 'b', 'c'])

  // reset
  onFetch.mockClear()
  expect(onFetch).toHaveBeenCalledTimes(0)

  // Won't re-fetch in new store
  find(users, ['a', 'b', 'c'])
  find(users, { name: 'A' })
  expect(onFetch).toHaveBeenCalledTimes(0)

  // Won't re-fetch for id query
  find(users, ['a', 'b'])
  expect(onFetch).toHaveBeenCalledTimes(0)
  get(users, 'a')
  expect(onFetch).toHaveBeenCalledTimes(0)

  // Will re-fetch for not-fetch before
  get(users, 'x')
  expect(onFetch).toHaveBeenCalledTimes(1)
})

const Tasks = defineCollection('tasks', {
  idField: 'id',
  cast(doc) {
    doc.dateAt = new Date(doc.dateAt)
    return doc
  },
})
const rehydrateReducer = (state, action) => {
  if (action.type === 'rehydrate') return action.state
  return state
}
const preloadState = {
  datavan: {
    tasks: { byId: { t1: { id: 't1', name: 'customize idField', num: 1, dateAt: '2017-09-01T01:00:00Z', done: 0 } } },
  },
}
const persistState = {
  datavan: {
    tasks: { byId: { t1: { id: 't1', name: 'new', rehydrate: 1, dateAt: '2017-10-01T01:00:00Z' } } },
  },
}

test('load stored data Async', async () => {
  const store = createStore(rehydrateReducer, preloadState, datavanEnhancer())
  const mockCubscribe = jest.fn()
  store.subscribe(mockCubscribe)

  // get, set before rehydrate
  const tasks = Tasks(store)
  set(tasks, { ...get(tasks, 't1'), num: 2 })
  expect(mockCubscribe).toHaveBeenCalledTimes(1)
  expect(get(tasks, 't1')).toMatchObject({ name: 'customize idField', num: 2 })
  expect(get(tasks, 't1').dateAt instanceof Date).toBe(true)
  expect(get(Tasks(store), 't1').dateAt.toISOString()).toBe('2017-09-01T01:00:00.000Z')
  expect(mockCubscribe).toHaveBeenCalledTimes(1)

  // Need to block all mutation before first change?

  // Async rehydrate
  await delay(60)
  expect(mockCubscribe).toHaveBeenCalledTimes(1)
  store.dispatch({
    type: 'rehydrate',
    // NOTE need to loadCollections and merge into datavan namespace
    state: { ...store.getState(), datavan: loadCollections(store, persistState.datavan) },
  })

  expect(get(Tasks(store), 't1')).toMatchObject({ name: 'new', rehydrate: 1, num: 2, done: 0 })
  expect(get(Tasks(store), 't1').dateAt instanceof Date).toBe(true)
  expect(get(Tasks(store), 't1').dateAt.toISOString()).toBe('2017-10-01T01:00:00.000Z')
  expect(mockCubscribe).toHaveBeenCalledTimes(2)
})

test('load stored data sync', async () => {
  const store = createStore(rehydrateReducer, preloadState, datavanEnhancer())
  const mockCubscribe = jest.fn()
  store.subscribe(mockCubscribe)

  // get, set before rehydrate
  const tasks = Tasks(store)
  set(tasks, { ...get(tasks, 't1'), num: 2 })
  expect(mockCubscribe).toHaveBeenCalledTimes(1)
  expect(get(tasks, 't1')).toMatchObject({ name: 'customize idField', num: 2 })
  expect(get(tasks, 't1').dateAt instanceof Date).toBe(true)
  expect(get(Tasks(store), 't1').dateAt.toISOString()).toBe('2017-09-01T01:00:00.000Z')
  expect(mockCubscribe).toHaveBeenCalledTimes(1)

  // rehydrate
  store.dispatch({
    type: 'rehydrate',
    // NOTE need to loadCollections and merge into datavan namespace
    state: { ...store.getState(), datavan: loadCollections(store, persistState.datavan) },
  })

  expect(mockCubscribe).toHaveBeenCalledTimes(2)
  expect(get(Tasks(store), 't1')).toMatchObject({ name: 'new', rehydrate: 1, num: 2, done: 0 })
  expect(get(Tasks(store), 't1').dateAt instanceof Date).toBe(true)
  expect(get(Tasks(store), 't1').dateAt.toISOString()).toBe('2017-10-01T01:00:00.000Z')
  expect(mockCubscribe).toHaveBeenCalledTimes(2)
})

test('load', async () => {
  const users = createCollection({})
  load(users, { byId: { a: { x: 1, y: 1 } } })
  expect(getAll(users)).toEqual({ a: { x: 1, y: 1 } })
  load(users, { byId: { a: { x: 2 } } })
  expect(getAll(users)).toEqual({ a: { x: 2, y: 1 } })
  load(users, { byId: { a: { x: 3, y: 3, z: 3 } } }, { loadAs: loadAsDefaults })
  expect(getAll(users)).toEqual({ a: { x: 2, y: 1, z: 3 } })
})
