import { createStore } from 'redux'

import { datavanEnhancer, findInMemory } from '..'

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

test('keyByValue', async () => {
  const store = createStore(s => s || {}, null, datavanEnhancer(ctx))
  expect(findInMemory(store, 'data', {}, { keyBy: 'key', keyByValue: 'value' })).toEqual({ 'x-key': 'x-val', 'y-key': 'y-val' })
})

test('distinct', async () => {
  const store = createStore(s => s || {}, null, datavanEnhancer(ctx))
  expect(findInMemory(store, 'data', {}, { distinct: 'value' })).toEqual(['x-val', 'y-val'])
})
