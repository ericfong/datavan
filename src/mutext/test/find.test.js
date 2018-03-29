import _ from 'lodash'

import { createDb, pickBy, filter, TMP_ID_PREFIX as TMP } from '..'
import { onFetchEcho, onFetchById } from './test-util'
import { getQueryIds } from '../collection-fetch'

test.skip('find inResponse', async () => {
  const db = createDb({
    users: {
      onFetch({ $$search, $$limit }) {
        const res = _.map(_.range(0, $$limit), i => {
          return { _id: `${$$search}-${i}`, name: `${$$limit}-${i}` }
        })
        return Promise.resolve(res)
      },
    },
  })

  const getIds = docs => _.map(docs, '_id').sort()
  const findInResponse = (q, opt) => getIds(db.users.find(q, opt))

  findInResponse({ $$search: 'a', $$limit: 2 })
  findInResponse({ $$search: 'b', $$limit: 3 })

  await db.users.getPending()
  expect(getIds(db.users.getById())).toEqual(['a-0', 'a-1', 'b-0', 'b-1', 'b-2'])

  expect(findInResponse({ $$search: 'a', $$limit: 2 })).toEqual(['a-0', 'a-1'])
  expect(findInResponse({ $$search: 'b', $$limit: 3 })).toEqual(['b-0', 'b-1', 'b-2'])
})

test('find in original', async () => {
  const db = createDb({ users: { onFetch: onFetchEcho } })
  await db.users.findAsync(['a', 'b'])
  db.users.update({ name: 'A' }, { $merge: { newField: 1 } })
  expect(_.map(db.users.getById(), 'name')).toEqual(['A', 'B'])
  db.users.insert({ _id: 'c', name: 'C' })
  expect(filter({ ...db.users.getPreloads(), ...db.users.getOriginals() }, {})).toEqual([{ _id: 'a', name: 'A' }, { _id: 'b', name: 'B' }])
  expect(_.map(db.users.getById(), 'name')).toEqual(['A', 'B', 'C'])
})

test('findAsync', async () => {
  const db = createDb({ users: { onFetch: onFetchEcho } })
  expect(await db.users.findAsync(['a'])).toEqual([{ _id: 'a', name: 'A' }])
})

test('query = null or undefined', async () => {
  const db = createDb({
    users: {
      initState: {
        1: {
          key: 'x-key',
          value: 'x-val',
        },
        2: {
          key: 'y-key',
          value: 'y-val',
        },
        3: null,
        4: undefined,
      },
    },
  })
  expect(db.users.getById()).toEqual({ 1: { key: 'x-key', value: 'x-val' }, 2: { key: 'y-key', value: 'y-val' }, 3: null })
  expect(db.users.pick() |> _.values).toHaveLength(3)
  expect(db.users.pick(null) |> _.values).toHaveLength(3)
  // query={} will skip all falsy doc, BUT query=null
  expect(db.users.pick({}) |> _.values).toHaveLength(2)
  expect(db.users.pick('') |> _.values).toHaveLength(0)
  expect(db.users.pick([]) |> _.values).toHaveLength(0)
})

test('hasFetch cache', async () => {
  const onFetch = jest.fn((query, option, self) => onFetchById(query, self.idField, () => undefined))
  const db = createDb({ users: { onFetch } })
  db.users.find(['id-123'])
  await db.users.getPending()
  db.users.find(['id-123'])
  expect(onFetch).toHaveBeenCalledTimes(1)
})

test('onFetch with $invalidate', async () => {
  const onFetch = jest.fn(() =>
    Promise.resolve({
      byId: { 'id-123': undefined },
      $invalidate: ['id-123'],
    })
  )
  const db = createDb({ users: { onFetch } })
  db.users.find(['id-123'])
  await db.users.getPending()
  db.users.find(['id-123'])
  expect(onFetch).toHaveBeenCalledTimes(2)
})

test('without tmp-id', async () => {
  const db = createDb({ users: { onFetch: jest.fn(onFetchEcho) } })
  // won't call onFetch if only null or tmp
  db.users.find([`${TMP}-123`, null, `${TMP}-456`])
  expect(db.users.onFetch).toHaveBeenCalledTimes(0)
  db.users.get(undefined)
  db.users.get(null)
  expect(db.users.onFetch).toHaveBeenCalledTimes(0)

  // removed tmp-id
  db.users.find(['db-id-abc', `${TMP}-123`, 'db-id-xyz', `${TMP}-456`])
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)
  expect(_.last(db.users.onFetch.mock.calls)[0]).toEqual(['db-id-abc', 'db-id-xyz'])

  // reverse will use same cacheKey??
  db.users.find(['db-id-xyz', 'db-id-abc'])
  expect(_.last(db.users.onFetch.mock.calls)[0]).toEqual(['db-id-abc', 'db-id-xyz'])

  // find other fields with tmp id
  db.users.onFetch.mockClear()
  db.users.find({ userId: `${TMP}-123`, deleted: 0 })
  expect(db.users.onFetch).toHaveBeenCalledTimes(0)
  db.users.find({ userId: { $in: [`${TMP}-123`] }, deleted: 0 })
  expect(db.users.onFetch).toHaveBeenCalledTimes(0)
})

test('consider getFetchKey', async () => {
  const db = createDb({
    users: {
      onFetch: jest.fn(onFetchEcho),
      getFetchQuery: () => ({}),
      getQueryString: () => '',
    },
  })

  db.users.find(['db-1'])
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)
  db.users.find(['db-2'])
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)
  db.users.find(['db-3'])
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)
  db.users.get('db-4')
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)

  // invalid id won't refetch
  db.users.find([null])
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)
  await db.users.getPending()
  db.users.find([null])
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)
})

test('findInMemory', async () => {
  const db = createDb({ users: { onFetch: jest.fn(onFetchEcho) } })
  pickBy(db.users.getById(), ['db-1'])
  expect(db.users.onFetch).toHaveBeenCalledTimes(0)
})

test('basic', async () => {
  let calledFind = 0
  let calledGet = 0
  const db = createDb({
    users: {
      onFetch: jest.fn((query, option, collection) => {
        if (query) {
          const ids = getQueryIds(query)
          if (ids) {
            ++calledGet
            // console.log('onFetch get', ids, calledGet)
            return Promise.resolve(
              _.compact(
                _.map(ids, id => {
                  if (id === 'not_exists') return null
                  return { _id: id, name: `${id} name` }
                })
              )
            )
          }
        }
        ++calledFind
        return Promise.resolve([{ _id: 'u2', name: `${collection.name} Eric` }])
      }),
    },
  })

  // normal get
  expect(db.users.get('u1')).toBe(undefined)
  await db.users.getPending()
  expect(db.users.get('u1')).toEqual({ _id: 'u1', name: 'u1 name' })

  // find again will same as search
  expect(db.users.find({})).toEqual([{ _id: 'u1', name: 'u1 name' }])
  await db.users.getPending()
  expect(db.users.find({})).toEqual([{ _id: 'u1', name: 'u1 name' }, { _id: 'u2', name: 'users Eric' }])

  expect(calledGet).toBe(1)
  db.users.get('u1')
  await db.users.getPending()
  expect(calledGet).toBe(1)

  // load something missing
  db.users.get('not_exists')
  await db.users.getPending()
  expect(calledGet).toBe(2)

  // load local won't affect
  db.users.get('u1')
  expect(calledGet).toBe(2)

  expect(calledFind).toBe(1)
  expect(calledGet).toBe(2)
  expect(db.users.getById()).toEqual({
    u1: { _id: 'u1', name: 'u1 name' },
    u2: { _id: 'u2', name: 'users Eric' },
  })
})
