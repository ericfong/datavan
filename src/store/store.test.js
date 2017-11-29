// import _ from 'lodash'
import delay from 'delay'
import { createStore } from 'redux'

import { datavanEnhancer, defineCollection, plugBrowser, set, gcStore, invalidateStore, getState, getAll } from '..'

test('gcStore all&now', async () => {
  const gcTime = 1
  const Users = defineCollection('users', { initState: { byId: { a: 'A' } }, onFetch: () => {}, gcTime })
  const store = createStore(null, null, datavanEnhancer())

  expect(getState(Users(store)).byId).toEqual({ a: 'A' })
  gcStore(store, { all: true, now: true })
  expect(getState(Users(store)).byId).toEqual({})
})

test('gcStore', async () => {
  const gcTime = 100
  const Users = defineCollection('users', { initState: { byId: { a: 'A' } }, onFetch: () => {}, gcTime })
  const store = createStore(null, null, datavanEnhancer())

  expect(getState(Users(store)).byId).toEqual({ a: 'A' })
  await delay(gcTime * 2)
  gcStore(store)
  expect(getState(Users(store)).byId).toEqual({})
})

test('invalidateStore', async () => {
  const gcTime = 100
  const Users = defineCollection('users', { initState: { byId: { a: 'A' } }, onFetch: () => {}, gcTime })
  const store = createStore(null, null, datavanEnhancer())

  expect(Users(store)._byIdAts.a).toBeTruthy()
  await delay(gcTime * 2)
  invalidateStore(store)
  expect(getState(Users(store)).byId).toEqual({ a: 'A' })
  expect(Users(store)._byIdAts.a).toBeFalsy()
})

test('defineCollection', async () => {
  const store = createStore(null, null, datavanEnhancer({ collections: { browser: plugBrowser({}) } }))
  expect(getAll(store, 'browser')).toEqual({})
})

test('merge collections states again will not trigger new dispatch', async () => {
  const Users = defineCollection({ name: 'users' })
  const store = createStore(null, null, datavanEnhancer())

  const mySubscribe = jest.fn()
  store.subscribe(mySubscribe)

  set(Users(store), 'u1', 'user 1 name!!', { flush: true })
  expect(mySubscribe).toHaveBeenCalledTimes(1)

  set(Users(store), 'u1', 'user 1 name!!', { flush: true })
  expect(mySubscribe).toHaveBeenCalledTimes(1)
})
