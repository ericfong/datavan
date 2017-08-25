import _ from 'lodash'
import Collection from './Collection'
import { getQueryIds } from './core/finder'
import { TMP_ID_PREFIX as TMP } from './core/idUtil'
import { onFetchById } from '..'

const timeoutResolve = (value, t = 50) => new Promise(resolve => setTimeout(() => resolve(value), t))

function echo(query) {
  const ids = getQueryIds(query, '_id')
  // console.log('echo', ids)
  return Promise.resolve(
    _.compact(
      _.map(ids, _id => {
        if (_id) {
          return { _id, name: `Echo-${_id}` }
        }
      })
    )
  )
}

test('hasFetch cache', async () => {
  const users = Collection({
    onFetch: jest.fn((query, option, self) => onFetchById(query, self.idField, () => timeoutResolve(undefined))),
  })
  users.find(['id-123'])
  await Promise.all(users.allPendings())
  users.find(['id-123'])
  expect(users.onFetch).toHaveBeenCalledTimes(1)
})

test('onFetch with $invalidate', async () => {
  const users2 = Collection({
    onFetch: jest.fn(() => timeoutResolve({ 'id-123': undefined, $invalidate: ['id-123'] })),
  })
  users2.find(['id-123'])
  await Promise.all(users2.allPendings())
  users2.find(['id-123'])
  expect(users2.onFetch).toHaveBeenCalledTimes(2)
})

test('without tmp-id', async () => {
  const Users = Collection({ onFetch: jest.fn(echo) })
  // won't call onFetch if only null or tmp
  Users.find([`${TMP}-123`, null, `${TMP}-456`])
  expect(Users.onFetch).toHaveBeenCalledTimes(0)
  Users.get(undefined)
  Users.get(null)
  expect(Users.onFetch).toHaveBeenCalledTimes(0)

  // removed tmp-id
  Users.find(['db-id-abc', `${TMP}-123`, 'db-id-xyz', `${TMP}-456`])
  expect(Users.onFetch).toHaveBeenCalledTimes(1)
  expect(_.last(Users.onFetch.mock.calls)[0]).toEqual(['db-id-abc', 'db-id-xyz'])

  // reverse will use same cacheKey??
  Users.find(['db-id-xyz', 'db-id-abc'])
  expect(_.last(Users.onFetch.mock.calls)[0]).toEqual(['db-id-abc', 'db-id-xyz'])

  // find other fields with tmp id
  Users.onFetch.mockClear()
  Users.find({ userId: `${TMP}-123`, deleted: 0 })
  expect(Users.onFetch).toHaveBeenCalledTimes(0)
  Users.find({ userId: { $in: [`${TMP}-123`] }, deleted: 0 })
  expect(Users.onFetch).toHaveBeenCalledTimes(0)
})

test('consider getFetchKey', async () => {
  const users = Collection({ onFetch: jest.fn(echo), getFetchQuery: () => ({}), getFetchKey: () => '' })
  users.find(['db-1'])
  expect(users.onFetch).toHaveBeenCalledTimes(1)
  users.find(['db-2'])
  expect(users.onFetch).toHaveBeenCalledTimes(1)
  users.find(['db-3'])
  expect(users.onFetch).toHaveBeenCalledTimes(1)
  users.get('db-4')
  expect(users.onFetch).toHaveBeenCalledTimes(1)

  // invalid id won't refetch
  users.find([null])
  expect(users.onFetch).toHaveBeenCalledTimes(1)
  await Promise.all(users.allPendings())
  users.find([null])
  expect(users.onFetch).toHaveBeenCalledTimes(1)
})

test('fetch: false', async () => {
  const Users = Collection({ onFetch: jest.fn(echo) })
  Users.find(['db-1'], { fetch: false })
  expect(Users.onFetch).toHaveBeenCalledTimes(0)
  Users.find(['db-1'])
  expect(Users.onFetch).toHaveBeenCalledTimes(1)
  Users.invalidate()
  Users.find(['db-1'], { fetch: false })
  expect(Users.onFetch).toHaveBeenCalledTimes(1)
})

test('batch get failback to find', async () => {
  const Users = Collection({ onFetch: jest.fn(echo) })
  Users.get('1')
  Users.get('2')
  await Promise.all(Users.allPendings())
  expect(Users.get('1')).toEqual({ _id: '1', name: 'Echo-1' })

  // TODO expect(Users.onFetch).toHaveBeenCalledTimes(1)

  expect(await Users.findAsync({ _id: '3' })).toEqual([{ _id: '3', name: 'Echo-3' }])
})

test('basic', async () => {
  let calledFind = 0
  let calledGet = 0
  const Users = Collection({
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
  expect(Users.get('u1')).toBe(undefined)
  await Promise.all(Users.allPendings())
  expect(Users.get('u1')).toEqual({ _id: 'u1', name: 'u1 name' })

  // find again will same as search
  expect(Users.find({}, { sort: { _id: 1 } })).toEqual([{ _id: 'u1', name: 'u1 name' }])
  await Promise.all(Users.allPendings())
  expect(Users.find({}, { sort: { _id: 1 } })).toEqual([{ _id: 'u1', name: 'u1 name' }, { _id: 'u2', name: 'users Eric' }])

  expect(calledGet).toBe(1)
  // won't affect calledGet, because search or find will fill individual cacheTimes
  Users.get('u2')
  await Promise.all(Users.allPendings())
  expect(calledGet).toBe(1)

  // load something missing
  Users.get('not_exists')
  await Promise.all(Users.allPendings())
  expect(calledGet).toBe(2)

  // load local won't affect
  Users.get('u1')
  expect(calledGet).toBe(2)

  expect(calledFind).toBe(1)
  expect(calledGet).toBe(2)
  expect(Users.onGetAll()).toEqual({
    u1: { _id: 'u1', name: 'u1 name' },
    u2: { _id: 'u2', name: 'users Eric' },
  })
})
