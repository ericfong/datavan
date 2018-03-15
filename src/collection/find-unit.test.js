import _ from 'lodash'

import { createCollection } from '../test/util'
import { getAll, find, getPending } from '../..'

test('find inResponse', async () => {
  const collection = createCollection({
    onFetch({ $$search, $$limit }) {
      const res = _.map(_.range(0, $$limit), i => {
        return { _id: `${$$search}-${i}`, name: `${$$limit}-${i}` }
      })
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
