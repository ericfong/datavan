import _ from 'lodash'
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
const createTestStore = () => createStore(s => s || {}, null, datavanEnhancer(ctx))

test('query = null or undefined', async () => {
  const store = createTestStore()
  expect(findInMemory(store, 'data')).toHaveLength(2)
  expect(findInMemory(store, 'data', null)).toHaveLength(2)
  expect(findInMemory(store, 'data', '')).toHaveLength(0)
  expect(findInMemory(store, 'data', [])).toHaveLength(0)
})

test('keyBy', async () => {
  const store = createTestStore()
  expect(_.keyBy(findInMemory(store, 'data', {}), 'key')).toEqual({
    'x-key': { key: 'x-key', value: 'x-val' },
    'y-key': { key: 'y-key', value: 'y-val' },
  })
})
