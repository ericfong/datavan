import Collection from '../Collection'
import createStorage from './createStorage'

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
  const table1 = Collection(createStorage(localStorage))
  const table2 = Collection(createStorage(localStorage))

  expect(table1.get('u1')).toBe(null)
  table1.set('u1', 'hi')
  expect(table1.get('u1')).toBe('hi')

  // console.log('>>> table2')

  // should access global localStorage
  expect(table2.get('u1')).toBe('hi')
  table2.set('u1', 'world')

  // console.log('>>> table1')

  // table1 should get new state, which set by table2 in Sync
  expect(table1.get('u1')).toBe('world')
})
