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

test('query = null or undefined', async () => {
  const store = createStore(s => s || {}, null, datavanEnhancer(ctx))
  findInMemory(store, 'data')
  findInMemory(store, 'data', null)
})

test('keyBy', async () => {
  const store = createStore(s => s || {}, null, datavanEnhancer(ctx))
  expect(findInMemory(store, 'data', {}, { keyBy: 'key' })).toEqual({
    'x-key': { key: 'x-key', value: 'x-val' },
    'y-key': { key: 'y-key', value: 'y-val' },
  })
})
