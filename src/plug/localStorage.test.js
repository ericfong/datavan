import { createStore } from 'redux'
import { datavanEnhancer, defineCollection, plugLocalStorage } from '..'

global.localStorage = {
  getItem(id) {
    // NOTE getItem(id) return null instead of undefined?
    // localStorage[id] return undefined
    return this[id] || null
  },
  setItem(id, v) {
    this[id] = v
  },
}

it('basic', async () => {
  const LocalStorage = defineCollection(plugLocalStorage(localStorage)({ name: 'localStorage' }))
  const store1 = createStore(null, null, datavanEnhancer)
  const store2 = createStore(null, null, datavanEnhancer)

  const subscriber1 = jest.fn()
  store1.subscribe(subscriber1)
  const subscriber2 = jest.fn()
  store2.subscribe(subscriber2)

  expect(LocalStorage(store1).get('u1')).toBe(null)
  LocalStorage(store1).set('u1', 'hi', { flush: true })
  expect(subscriber1).toHaveBeenCalledTimes(1)
  expect(LocalStorage(store1).get('u1')).toBe('hi')

  // console.log('>>> table2')

  // should access global localStorage
  expect(LocalStorage(store2).get('u1')).toBe('hi')
  LocalStorage(store2).set('u1', 'world', { flush: true })
  expect(subscriber2).toHaveBeenCalledTimes(1)

  // console.log('>>> table1')

  // table1 should get new state, which set by table2 in Sync
  expect(LocalStorage(store1).get('u1')).toBe('world')
})
