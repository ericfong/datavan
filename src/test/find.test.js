import _ from 'lodash'

import createCollection from './util/createCollection'
import { getQueryIds } from '../collection/fetcher'
import { getPending, findAsync, insert, update, getAll, find, get, TMP_ID_PREFIX as TMP, reset, findInMemory } from '..'
import onFetchEcho, { timeoutResolve } from './util/onFetchEcho'

// import { printTimes } from '../datavanEnhancer'
//
// afterAll(printTimes)

function onFetchById(query, idField, func) {
  const ids = getQueryIds(query, idField)
  return Promise.all(_.map(ids, func)).then(values => _.zipObject(ids, values))
}

test('find in original', async () => {
  const users = createCollection({ onFetch: onFetchEcho })
  await findAsync(users, ['a', 'b'])
  update(users, { name: 'A' }, { $merge: { newField: 1 } })
  expect(_.map(getAll(users), 'name')).toEqual(['A', 'B'])
  insert(users, { _id: 'c', name: 'C' })
  expect(find(users, {}, { inOriginal: true })).toEqual([{ _id: 'a', name: 'A' }, { _id: 'b', name: 'B' }])
  expect(_.map(getAll(users), 'name')).toEqual(['A', 'B', 'C'])
})

test('findAsync', async () => {
  const users = createCollection({ onFetch: onFetchEcho })
  expect(await findAsync(users, ['a'])).toEqual([{ _id: 'a', name: 'A' }])
})

test('normalizeQuery', async () => {
  const users = createCollection({})
  expect(find(users)).toEqual([])
  expect(find(users, {})).toEqual([])
})

test('hasFetch cache', async () => {
  const users = createCollection({
    onFetch: jest.fn((query, option, self) => onFetchById(query, self.idField, () => timeoutResolve(undefined))),
  })
  find(users, ['id-123'])
  await getPending(users)
  find(users, ['id-123'])
  expect(users.onFetch).toHaveBeenCalledTimes(1)
})

test('onFetch with $invalidate', async () => {
  const users2 = createCollection({
    onFetch: jest.fn(() =>
      timeoutResolve({
        byId: { 'id-123': undefined },
        $invalidate: ['id-123'],
      })
    ),
  })
  find(users2, ['id-123'])
  await getPending(users2)
  find(users2, ['id-123'])
  expect(users2.onFetch).toHaveBeenCalledTimes(2)
})

test('without tmp-id', async () => {
  const Users = createCollection({ onFetch: jest.fn(onFetchEcho) })
  // won't call onFetch if only null or tmp
  find(Users, [`${TMP}-123`, null, `${TMP}-456`])
  expect(Users.onFetch).toHaveBeenCalledTimes(0)
  get(Users, undefined)
  get(Users, null)
  expect(Users.onFetch).toHaveBeenCalledTimes(0)

  // removed tmp-id
  find(Users, ['db-id-abc', `${TMP}-123`, 'db-id-xyz', `${TMP}-456`])
  expect(Users.onFetch).toHaveBeenCalledTimes(1)
  expect(_.last(Users.onFetch.mock.calls)[0]).toEqual(['db-id-abc', 'db-id-xyz'])

  // reverse will use same cacheKey??
  find(Users, ['db-id-xyz', 'db-id-abc'])
  expect(_.last(Users.onFetch.mock.calls)[0]).toEqual(['db-id-abc', 'db-id-xyz'])

  // find other fields with tmp id
  Users.onFetch.mockClear()
  find(Users, { userId: `${TMP}-123`, deleted: 0 })
  expect(Users.onFetch).toHaveBeenCalledTimes(0)
  find(Users, { userId: { $in: [`${TMP}-123`] }, deleted: 0 })
  expect(Users.onFetch).toHaveBeenCalledTimes(0)
})

test('consider getFetchKey', async () => {
  const users = createCollection({
    onFetch: jest.fn(onFetchEcho),
    getFetchQuery: () => ({}),
    getQueryString: () => '',
  })
  find(users, ['db-1'])
  expect(users.onFetch).toHaveBeenCalledTimes(1)
  find(users, ['db-2'])
  expect(users.onFetch).toHaveBeenCalledTimes(1)
  find(users, ['db-3'])
  expect(users.onFetch).toHaveBeenCalledTimes(1)
  get(users, 'db-4')
  expect(users.onFetch).toHaveBeenCalledTimes(1)

  // invalid id won't refetch
  find(users, [null])
  expect(users.onFetch).toHaveBeenCalledTimes(1)
  await getPending(users)
  find(users, [null])
  expect(users.onFetch).toHaveBeenCalledTimes(1)
})

test('findInMemory', async () => {
  const Users = createCollection({ onFetch: jest.fn(onFetchEcho) })
  findInMemory(Users, ['db-1'])
  expect(Users.onFetch).toHaveBeenCalledTimes(0)
})

test('basic', async () => {
  let calledFind = 0
  let calledGet = 0
  const Users = createCollection({
    name: 'users',
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
  })

  // normal get
  expect(get(Users, 'u1')).toBe(undefined)
  await getPending(Users)
  expect(get(Users, 'u1')).toEqual({ _id: 'u1', name: 'u1 name' })

  // find again will same as search
  expect(find(Users, {})).toEqual([{ _id: 'u1', name: 'u1 name' }])
  await getPending(Users)
  expect(find(Users, {})).toEqual([{ _id: 'u1', name: 'u1 name' }, { _id: 'u2', name: 'users Eric' }])

  expect(calledGet).toBe(1)
  get(Users, 'u1')
  await getPending(Users)
  expect(calledGet).toBe(1)

  // load something missing
  get(Users, 'not_exists')
  await getPending(Users)
  expect(calledGet).toBe(2)

  // load local won't affect
  get(Users, 'u1')
  expect(calledGet).toBe(2)

  expect(calledFind).toBe(1)
  expect(calledGet).toBe(2)
  expect(getAll(Users)).toEqual({
    u1: { _id: 'u1', name: 'u1 name' },
    u2: { _id: 'u2', name: 'users Eric' },
  })
})
