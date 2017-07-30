// import _ from 'lodash'
import { createStore } from 'redux'
import createEnhancer, { collect } from './createEnhancer'

test('merge collections states again will not trigger new dispatch', async () => {
  const Users = collect('users')
  const store = createEnhancer()(createStore)()

  const mySubscribe = jest.fn()
  store.subscribe(mySubscribe)

  Users(store).set('u1', 'user 1 name!!', { flush: true })
  expect(mySubscribe).toHaveBeenCalledTimes(1)

  Users(store).set('u1', 'user 1 name!!', { flush: true })
  expect(mySubscribe).toHaveBeenCalledTimes(1)
})
