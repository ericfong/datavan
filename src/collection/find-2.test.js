import _ from 'lodash'
import { createStore } from 'redux'

import { datavanEnhancer, findInMemory, getPending, getAll, find } from '..'
import { createCollection } from '../test/util'

test('find inResponse', async () => {
  const collection = createCollection({
    onFetch({ $$search, $$limit }) {
      const res = _.map(_.range(0, $$limit), i => ({ _id: `${$$search}-${i}`, name: `${$$limit}-${i}` }))
      return Promise.resolve(res)
    },
  })

  const getIds = docs => _.map(docs, '_id').sort()
  const findInResponse = (q, opt) => getIds(find(collection, q, opt))

  findInResponse({ $$search: 'a', $$limit: 2 })
  findInResponse({ $$search: 'b', $$limit: 3 })

  await getPending(collection)
  expect(getIds(getAll(collection))).toEqual(['a-0', 'a-1', 'b-0', 'b-1', 'b-2'])

  expect(findInResponse({ $$search: 'a', $$limit: 2 })).toEqual(['a-0', 'a-1'])
  expect(findInResponse({ $$search: 'b', $$limit: 3 })).toEqual(['b-0', 'b-1', 'b-2'])
})

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
