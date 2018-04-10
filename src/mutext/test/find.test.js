import _ from 'lodash'

import { createDb, pickBy, filter, TMP_ID_PREFIX as TMP } from '..'
import { onFetchEcho, onFetchById } from './test-util'

test('find in original', async () => {
  const db = createDb({ users: { onFetch: onFetchEcho } })
  await db.findAsync('users', ['a', 'b'])
  db.update('users', { name: 'A' }, { $merge: { newField: 1 } })
  expect(_.map(db.getById('users'), 'name')).toEqual(['A', 'B'])
  db.insert('users', { _id: 'c', name: 'C' })
  expect(filter({ ...db.getPreloads('users'), ...db.getOriginals('users') }, {})).toEqual([
    { _id: 'a', name: 'A' },
    { _id: 'b', name: 'B' },
  ])
  expect(_.map(db.getById('users'), 'name')).toEqual(['A', 'B', 'C'])
})

test('findAsync', async () => {
  const db = createDb({ users: { onFetch: onFetchEcho } })
  expect(await db.findAsync('users', ['a'])).toEqual([{ _id: 'a', name: 'A' }])
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
  expect(db.getById('users')).toEqual({ 1: { key: 'x-key', value: 'x-val' }, 2: { key: 'y-key', value: 'y-val' }, 3: null })
  expect(db.pick('users') |> _.values).toHaveLength(3)
  expect(db.pick('users', null) |> _.values).toHaveLength(3)
  // query={} will skip all falsy doc, BUT query=null
  expect(db.pick('users', {}) |> _.values).toHaveLength(2)
  expect(db.pick('users', '') |> _.values).toHaveLength(0)
  expect(db.pick('users', []) |> _.values).toHaveLength(0)
})

test('hasFetch cache', async () => {
  const onFetch = jest.fn((query, option, self) => onFetchById(query, self.idField, () => undefined))
  const db = createDb({ users: { onFetch } })
  db.find('users', ['id-123'])
  await db.getPending('users')
  db.find('users', ['id-123'])
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
  db.find('users', ['id-123'])
  await db.getPending('users')
  db.find('users', ['id-123'])
  expect(onFetch).toHaveBeenCalledTimes(2)
})

test('without tmp-id', async () => {
  const db = createDb({ users: { onFetch: jest.fn(onFetchEcho) } })
  // won't call onFetch if only null or tmp
  db.find('users', [`${TMP}-123`, null, `${TMP}-456`])
  expect(db.users.onFetch).toHaveBeenCalledTimes(0)
  db.get('users', undefined)
  db.get('users', null)
  expect(db.users.onFetch).toHaveBeenCalledTimes(0)

  // removed tmp-id
  db.find('users', ['db-id-abc', `${TMP}-123`, 'db-id-xyz', `${TMP}-456`])
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)
  expect(_.last(db.users.onFetch.mock.calls)[0]).toEqual({ _id: { $in: ['db-id-abc', 'db-id-xyz'] } })

  // reverse will use same cacheKey??
  db.find('users', ['db-id-xyz', 'db-id-abc'])
  expect(_.last(db.users.onFetch.mock.calls)[0]).toEqual({ _id: { $in: ['db-id-abc', 'db-id-xyz'] } })

  // find other fields with tmp id
  db.users.onFetch.mockClear()
  db.find('users', { userId: `${TMP}-123`, deleted: 0 })
  expect(db.users.onFetch).toHaveBeenCalledTimes(0)
  db.find('users', { userId: { $in: [`${TMP}-123`] }, deleted: 0 })
  expect(db.users.onFetch).toHaveBeenCalledTimes(0)
})

test('consider getFetchKey', async () => {
  const db = createDb({
    users: {
      onFetch: jest.fn(onFetchEcho),
      getFetchKey: () => '',
    },
  })

  db.find('users', ['db-1'])
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)
  db.find('users', ['db-2'])
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)
  db.find('users', ['db-3'])
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)
  db.get('users', 'db-4')
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)

  // invalid id won't refetch
  db.find('users', [null])
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)
  await db.getPending('users')
  db.find('users', [null])
  expect(db.users.onFetch).toHaveBeenCalledTimes(1)
})

test('findInMemory', async () => {
  const db = createDb({ users: { onFetch: jest.fn(onFetchEcho) } })
  pickBy(db.getById('users'), ['db-1'])
  expect(db.users.onFetch).toHaveBeenCalledTimes(0)
})

test('basic', async () => {
  let calledFind = 0
  let calledGet = 0
  const db = createDb({
    users: {
      onFetch: jest.fn((query, option, coll) => {
        if (query) {
          const ids = _.get(query, ['_id', '$in'])
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
        return Promise.resolve([{ _id: 'u2', name: `${coll.name} Eric` }])
      }),
    },
  })

  // normal get
  expect(db.get('users', 'u1')).toBe(undefined)
  await db.getPending('users')
  expect(db.get('users', 'u1')).toEqual({ _id: 'u1', name: 'u1 name' })

  // find again will same as search
  expect(db.find('users', {})).toEqual([{ _id: 'u1', name: 'u1 name' }])
  await db.getPending('users')
  expect(db.find('users', {})).toEqual([{ _id: 'u1', name: 'u1 name' }, { _id: 'u2', name: 'users Eric' }])

  expect(calledGet).toBe(1)
  db.get('users', 'u1')
  await db.getPending('users')
  expect(calledGet).toBe(1)

  // load something missing
  db.get('users', 'not_exists')
  await db.getPending('users')
  expect(calledGet).toBe(2)

  // load local won't affect
  db.get('users', 'u1')
  expect(calledGet).toBe(2)

  expect(calledFind).toBe(1)
  expect(calledGet).toBe(2)
  expect(db.getById('users')).toEqual({
    u1: { _id: 'u1', name: 'u1 name' },
    u2: { _id: 'u2', name: 'users Eric' },
  })
})
