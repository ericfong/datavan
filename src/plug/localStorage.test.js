import { createStore } from 'redux'
import { datavanEnhancer, defineCollection, plugLocalStorage, get, set } from '..'

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
  const LocalStorage = defineCollection('localStorage', plugLocalStorage(localStorage)({}))
  const store1 = createStore(null, null, datavanEnhancer())
  const store2 = createStore(null, null, datavanEnhancer())

  const subscriber1 = jest.fn()
  store1.subscribe(subscriber1)
  const subscriber2 = jest.fn()
  store2.subscribe(subscriber2)

  expect(get(LocalStorage(store1), 'u1')).toBe(null)
  set(LocalStorage(store1), 'u1', 'hi', { flush: true })
  expect(subscriber1).toHaveBeenCalledTimes(1)
  expect(get(LocalStorage(store1), 'u1')).toBe('hi')

  // console.log('>>> table2')

  // should access global localStorage
  expect(get(LocalStorage(store2), 'u1')).toBe('hi')
  set(LocalStorage(store2), 'u1', 'world', { flush: true })
  expect(subscriber2).toHaveBeenCalledTimes(1)

  // console.log('>>> table1')

  // table1 should get new state, which set by table2 in Sync
  expect(get(LocalStorage(store1), 'u1')).toBe('world')
})
