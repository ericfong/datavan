// import _ from 'lodash'
import { createStore } from 'redux'
import { datavanEnhancer, defineCollection, setOverrides, plugBrowser } from '.'

test('defineCollection', async () => {
  const Browser = defineCollection({ name: 'browser' })
  const store = datavanEnhancer(createStore)()
  setOverrides(store, {
    browser: plugBrowser,
  })
  expect(Browser(store).getAll()).toEqual({})
})

test('merge collections states again will not trigger new dispatch', async () => {
  const Users = defineCollection({ name: 'users' })
  const store = datavanEnhancer(createStore)()

  const mySubscribe = jest.fn()
  store.subscribe(mySubscribe)

  Users(store).set('u1', 'user 1 name!!', { flush: true })
  expect(mySubscribe).toHaveBeenCalledTimes(1)

  Users(store).set('u1', 'user 1 name!!', { flush: true })
  expect(mySubscribe).toHaveBeenCalledTimes(1)
})
