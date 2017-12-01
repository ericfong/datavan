import { createStore } from 'redux'
import { datavanEnhancer, plugLocalStorage, get, set } from '..'

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
  const collections = { localStorage: plugLocalStorage(localStorage)({}) }
  const store1 = createStore(null, null, datavanEnhancer({ collections }))
  const store2 = createStore(null, null, datavanEnhancer({ collections }))

  const subscriber1 = jest.fn()
  store1.subscribe(subscriber1)
  const subscriber2 = jest.fn()
  store2.subscribe(subscriber2)

  expect(get(store1, 'localStorage', 'u1')).toBe(null)
  set(store1, 'localStorage', 'u1', 'hi', { flush: true })
  expect(subscriber1).toHaveBeenCalledTimes(1)
  expect(get(store1, 'localStorage', 'u1')).toBe('hi')

  // console.log('>>> table2')

  // should access global localStorage
  expect(get(store2, 'localStorage', 'u1')).toBe('hi')
  set(store2, 'localStorage', 'u1', 'world', { flush: true })
  expect(subscriber2).toHaveBeenCalledTimes(1)

  // console.log('>>> table1')

  // table1 should get new state, which set by table2 in Sync
  expect(get(store1, 'localStorage', 'u1')).toBe('world')
})
