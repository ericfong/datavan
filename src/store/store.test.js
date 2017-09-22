// import _ from 'lodash'
import { createStore } from 'redux'
import { datavanEnhancer, defineCollection, setOverrides, plugBrowser, set } from '..'

test('defineCollection', async () => {
  const Browser = defineCollection({ name: 'browser' })
  const store = createStore(null, null, datavanEnhancer())
  setOverrides(store, {
    browser: plugBrowser,
  })
  expect(Browser(store).getAll()).toEqual({})
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
