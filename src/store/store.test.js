// import _ from 'lodash'
import delay from 'delay'
import { createStore } from 'redux'

import { datavanEnhancer, getCollection, plugBrowser, set, gcStore, invalidateStore, getState, getAll } from '..'

test('gcStore all&now', async () => {
  const gcTime = 1
  const collections = { users: { initState: { byId: { a: 'A' } }, onFetch: () => {}, gcTime } }
  const store = createStore(null, null, datavanEnhancer({ collections }))

  expect(getState(store, 'users').byId).toEqual({ a: 'A' })
  gcStore(store, { all: true, now: true })
  expect(getState(store, 'users').byId).toEqual({})
})

test('gcStore', async () => {
  const gcTime = 100
  const collections = { users: { initState: { byId: { a: 'A' } }, onFetch: () => {}, gcTime } }
  const store = createStore(null, null, datavanEnhancer({ collections }))

  expect(getState(store, 'users').byId).toEqual({ a: 'A' })
  await delay(gcTime * 2)
  gcStore(store)
  expect(getState(store, 'users').byId).toEqual({})
})

test('invalidateStore', async () => {
  const gcTime = 100
  const collections = { users: { initState: { byId: { a: 'A' } }, onFetch: () => {}, gcTime } }
  const store = createStore(null, null, datavanEnhancer({ collections }))

  expect(getCollection(store, 'users')._byIdAts.a).toBeTruthy()
  await delay(gcTime * 2)
  invalidateStore(store)
  expect(getState(store, 'users').byId).toEqual({ a: 'A' })
  expect(getCollection(store, 'users')._byIdAts.a).toBeFalsy()
})

test('defineCollection', async () => {
  const store = createStore(null, null, datavanEnhancer({ collections: { browser: plugBrowser({}) } }))
  expect(getAll(store, 'browser')).toEqual({})
})

test('merge collections states again will not trigger new dispatch', async () => {
  const collections = { users: {} }
  const store = createStore(null, null, datavanEnhancer({ collections }))

  const mySubscribe = jest.fn()
  store.subscribe(mySubscribe)

  set(store, 'users', 'u1', 'user 1 name!!', { flush: true })
  expect(mySubscribe).toHaveBeenCalledTimes(1)

  set(store, 'users', 'u1', 'user 1 name!!', { flush: true })
  expect(mySubscribe).toHaveBeenCalledTimes(1)
})
