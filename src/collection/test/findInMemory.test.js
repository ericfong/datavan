import { createStore } from 'redux'

import { datavanEnhancer, findInMemory } from '../..'

const ctx = {
  collections: {
    data: {
      initState: {
        1: {
          key: 'x-key',
          value: 'x-val',
        },
        2: {
          key: 'y-key',
          value: 'y-val',
        },
      },
    },
  },
}
const createTestStore = () => createStore(s => s || {}, null, datavanEnhancer(ctx))

test('query = null or undefined', async () => {
  const store = createTestStore()
  findInMemory(store, 'data')
  findInMemory(store, 'data', null)
})

test('keyBy', async () => {
  const store = createTestStore()
  expect(findInMemory(store, 'data', {}, { keyBy: 'key' })).toEqual({
    'x-key': { key: 'x-key', value: 'x-val' },
    'y-key': { key: 'y-key', value: 'y-val' },
  })
})
