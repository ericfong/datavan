import _ from 'lodash'

import createCollection from '../../test/util/createCollection'
import { getAll, find, getPending } from '../..'

test('find inResponse', async () => {
  const collection = createCollection({
    onFetch(query, option) {
      const { search, limit } = option
      const res = _.map(_.range(0, limit), i => {
        return { _id: `${search}-${i}`, name: `${search}-${i}` }
      })
      return Promise.resolve(res)
    },
  })

  const getIds = docs => _.map(docs, '_id').sort()
  const findInResponse = (q, opt) => getIds(find(collection, q, { ...opt, inResponse: true }))

  findInResponse(null, { search: 'a', limit: 2 })
  findInResponse(null, { search: 'b', limit: 3 })

  await getPending(collection)
  expect(getIds(getAll(collection))).toEqual(['a-0', 'a-1', 'b-0', 'b-1', 'b-2'])

  expect(findInResponse(null, { search: 'a', limit: 2 })).toEqual(['a-0', 'a-1'])
  expect(findInResponse(null, { search: 'b', limit: 3 })).toEqual(['b-0', 'b-1', 'b-2'])
})
