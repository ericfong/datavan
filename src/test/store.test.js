// import _ from 'lodash'
import delay from 'delay'
import { createStore } from 'redux'

import { datavanEnhancer, getCollection, set, resetStore, getAll } from '..'

// import { printTimes } from '../datavanEnhancer'
// afterAll(printTimes)

test('gcStore all&now', async () => {
  const gcTime = 1
  const collections = {
    users: { initState: { byId: { a: 'A' } }, onFetch: () => {}, gcTime },
  }
  const store = createStore(
    s => s || {},
    null,
    datavanEnhancer({ collections }),
  )

  expect(getAll(store, 'users')).toEqual({ a: 'A' })
  resetStore(store, { expired: false, now: true })
  expect(getAll(store, 'users')).toEqual({})
})

test('gcStore', async () => {
  const gcTime = 100
  const collections = {
    users: { initState: { byId: { a: 'A' } }, onFetch: () => {}, gcTime },
  }
  const store = createStore(
    s => s || {},
    null,
    datavanEnhancer({ collections }),
  )

  expect(getAll(store, 'users')).toEqual({ a: 'A' })
  await delay(gcTime * 2)
  resetStore(store, { mutated: true })
  expect(getAll(store, 'users')).toEqual({})
})

test('invalidateStore', async () => {
  const gcTime = 100
  const collections = {
    users: { initState: { byId: { a: 'A' } }, onFetch: () => {}, gcTime },
  }
  const store = createStore(
    s => s || {},
    null,
    datavanEnhancer({ collections }),
  )

  expect(getCollection(store, 'users')._byIdAts.a).toBeTruthy()
  await delay(gcTime * 2)
  resetStore(store, { mutated: false })
  expect(getAll(store, 'users')).toEqual({ a: 'A' })
  expect(getCollection(store, 'users')._byIdAts.a).toBeFalsy()
})

test('defineCollection', async () => {
  const store = createStore(
    s => s || {},
    null,
    datavanEnhancer({ collections: { user_table: {} } }),
  )
  expect(getAll(store, 'user_table')).toEqual({})
})

test('merge collections states again will trigger new dispatch', async () => {
  const collections = { users: {} }
  const store = createStore(
    s => s || {},
    null,
    datavanEnhancer({ collections }),
  )

  const mySubscribe = jest.fn()
  store.subscribe(mySubscribe)

  set(store, 'users', 'u1', 'user 1 name!!')
  expect(mySubscribe).toHaveBeenCalledTimes(1)

  set(store, 'users', 'u1', 'user 1 name!!')
  expect(mySubscribe).toHaveBeenCalledTimes(2)
})
