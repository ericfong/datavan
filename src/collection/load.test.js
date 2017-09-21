import _ from 'lodash'
import { createStore } from 'redux'
import delay from 'delay'

import { createCollection, defineCollection, datavanEnhancer, getState, getAll, get, find, set, loadCollections, allPendings } from '..'
import { load, loadAsDefaults } from './load'

test('load _findAts,_getAts and no re-fetch-find', async () => {
  const users = createCollection({
    initState: {
      byId: { 1: { _id: '1', name: 'A' } },
      fetchAts: { '[{"name":"A"},{}]': 1 },
    },
    onFetch: jest.fn(),
  })
  expect(Object.keys(getState(users).fetchAts)).toEqual(['[{"name":"A"},{}]'])

  find(users, { name: 'A' })
  await allPendings(users)
  expect(users.onFetch).toHaveBeenCalledTimes(0)
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
  expect(get(tasks, 't1')).toMatchObject({ name: 'customize idField', num: 2 })
  expect(get(tasks, 't1').dateAt instanceof Date).toBe(true)
  expect(get(Tasks(store), 't1').dateAt.toISOString()).toBe('2017-09-01T01:00:00.000Z')
  expect(mockCubscribe).toHaveBeenCalledTimes(0)

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
  expect(get(tasks, 't1')).toMatchObject({ name: 'customize idField', num: 2 })
  expect(get(tasks, 't1').dateAt instanceof Date).toBe(true)
  expect(get(Tasks(store), 't1').dateAt.toISOString()).toBe('2017-09-01T01:00:00.000Z')
  expect(mockCubscribe).toHaveBeenCalledTimes(0)

  // rehydrate
  store.dispatch({
    type: 'rehydrate',
    // NOTE need to loadCollections and merge into datavan namespace
    state: { ...store.getState(), datavan: loadCollections(store, persistState.datavan) },
  })

  expect(get(Tasks(store), 't1')).toMatchObject({ name: 'new', rehydrate: 1, num: 2, done: 0 })
  expect(get(Tasks(store), 't1').dateAt instanceof Date).toBe(true)
  expect(get(Tasks(store), 't1').dateAt.toISOString()).toBe('2017-10-01T01:00:00.000Z')
  expect(mockCubscribe).toHaveBeenCalledTimes(1)
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
