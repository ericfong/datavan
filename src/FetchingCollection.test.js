import _ from 'lodash'

import { defineStore, defineCollection } from '.'

function getQueryIds(query, idField = '_id') {
  if (Array.isArray(query)) return query
  const queryId = query[idField]
  if (queryId) {
    if (Array.isArray(queryId.$in)) return queryId.$in
    return [queryId]
  }
}
function echoOnFetch(query) {
  return _.map(getQueryIds(query), _id => ({ _id, name: `Echo-${_id}` }))
}

test('gc', async () => {
  const coll = new (defineCollection({
    gcTime: 0,
    onFetch: jest.fn(echoOnFetch),
  }))({})
  const gcSpy = jest.spyOn(coll, '_gc')

  expect(await coll.findAsync(['db-1'])).toEqual([{ _id: 'db-1', name: 'Echo-db-1' }])
  expect(gcSpy).toHaveBeenCalledTimes(1)

  // db1 removed
  await coll.findAsync(['db-2'])
  expect(_.map(coll.getState(), '_id')).toEqual(['db-2'])
  expect(gcSpy).toHaveBeenCalledTimes(2)

  // re-fetch dc-1
  expect(await coll.findAsync(['db-1'])).toEqual([{ _id: 'db-1', name: 'Echo-db-1' }])
  expect(gcSpy).toHaveBeenCalledTimes(3)
})

test('fetch: false', async () => {
  const coll = new (defineCollection({
    onFetch: jest.fn(echoOnFetch),
  }))({})
  coll.find(['db-1'], { fetch: false })
  expect(coll.onFetch).toHaveBeenCalledTimes(0)
  coll.find(['db-1'])
  expect(coll.onFetch).toHaveBeenCalledTimes(1)
  coll.invalidate()
  coll.find(['db-1'], { fetch: false })
  expect(coll.onFetch).toHaveBeenCalledTimes(1)
})

test('$request', async () => {
  const createStore = defineStore({
    users: defineCollection({
      requires: ['roles', 'blogs'],
      onFetch: jest.fn(({ $request }) => {
        if ($request === 'request-only-aggregate-count') {
          return Promise.resolve({ $request: [$request, 100000] })
        }
        if ($request === 'complex-query-1') {
          return Promise.resolve([{ _id: '1', age: 10 }, { _id: '2', gender: 'M' }, { _id: '3', name: 'not-related' }])
        }
        if ($request === 'complex-query-2') {
          return Promise.resolve({
            $byId: {
              4: { _id: '4', age: 20, roleId: '2' },
            },
            $relations: {
              roles: [{ _id: '5', role: 'reader' }],
              blogs: [{ _id: '6', title: 'How to use datavan', userId: '1' }],
            },
          })
        }
      }),
    }),
    roles: defineCollection(),
    blogs: defineCollection(),
  })
  const dv = createStore()

  // $request only
  expect(await dv.users.findAsync({ $request: 'request-only-aggregate-count' })).toEqual(['request-only-aggregate-count', 100000])

  // complex query 1
  const complexQuery = { $or: [{ age: 10 }, { gender: 'M' }], $request: 'complex-query-1' }
  dv.users.find(complexQuery)
  await dv.users.getPromise()
  expect(dv.users.find(complexQuery, { sort: { _id: 1 } })).toEqual([{ _id: '1', age: 10 }, { _id: '2', gender: 'M' }])

  // complex query 2
  const complexQuery2 = { age: 20, $request: 'complex-query-2' }
  dv.users.find(complexQuery2)
  await dv.users.getPromise()
  expect(dv.users.find(complexQuery2)).toEqual([{ _id: '4', age: 20, roleId: '2' }])
  expect(dv.roles.getState()).toEqual({ 5: { _id: '5', role: 'reader' } })
  expect(dv.blogs.getState()).toEqual({ 6: { _id: '6', title: 'How to use datavan', userId: '1' } })
})

test('consider calcFetchKey', async () => {
  const coll = new (defineCollection({
    onFetch: jest.fn(echoOnFetch),
    calcFetchKey: () => '',
  }))({})
  coll.find(['db-1'])
  expect(coll.onFetch).toHaveBeenCalledTimes(1)
  coll.find(['db-2'])
  expect(coll.onFetch).toHaveBeenCalledTimes(1)
  coll.find(['db-3'])
  expect(coll.onFetch).toHaveBeenCalledTimes(1)
  coll.get('db-4')
  expect(coll.onFetch).toHaveBeenCalledTimes(1)
})

test('consider localId', async () => {
  const coll = new (defineCollection({
    onFetch: jest.fn(echoOnFetch),
  }))({})

  // won't call onFetch if only null or tmp
  coll.find(['tmp-123', null, 'tmp-456'])
  expect(coll.onFetch).toHaveBeenCalledTimes(0)
  coll.get(undefined)
  coll.get(null)
  expect(coll.onFetch).toHaveBeenCalledTimes(0)

  // removed tmp-id
  coll.find(['db-id-abc', 'tmp-123', 'db-id-xyz', 'tmp-456'])
  expect(coll.onFetch).toHaveBeenCalledTimes(1)
  expect(_.last(coll.onFetch.mock.calls)[0]).toEqual(['db-id-abc', 'db-id-xyz'])

  // reverse will use same cacheKey
  coll.find(['db-id-xyz', 'db-id-abc'])
  expect(_.last(coll.onFetch.mock.calls)[0]).toEqual(['db-id-abc', 'db-id-xyz'])

  // find other fields with tmp id
  coll.onFetch.mockClear()
  coll.find({ userId: 'tmp-123', deleted: 0 })
  expect(coll.onFetch).toHaveBeenCalledTimes(0)
  coll.find({ userId: { $in: ['tmp-123'] }, deleted: 0 })
  expect(coll.onFetch).toHaveBeenCalledTimes(0)
})

test('sync get', async () => {
  const createStore = defineStore({
    users: defineCollection({
      onFetch(query) {
        const ids = getQueryIds(query)
        return _.map(ids, _id => ({ _id, name: `Echo-${_id}` }))
      },
    }),
  })
  const db = createStore()

  expect(db.users.get('1')).toEqual({ _id: '1', name: 'Echo-1' })
  expect(db.users.get('2')).toEqual({ _id: '2', name: 'Echo-2' })
  expect(db.users.getPromise()).toBe(null)
})

test('batch get failback to find', async () => {
  const createStore = defineStore({
    users: defineCollection({
      onFetch(query) {
        // console.log('onFetch', query)
        const ids = getQueryIds(query)
        return Promise.resolve(_.map(ids, _id => ({ _id, name: `Echo-${_id}` })))
      },
    }),
  })
  const db = createStore()

  db.users.get('1')
  const p1 = db.users.findAsync({ _id: '2' }).then(r => r[0])
  await db.users.getPromise()
  expect(db.users.get('1')).toEqual({ _id: '1', name: 'Echo-1' })
  expect(await p1).toEqual({ _id: '2', name: 'Echo-2' })
})

test('basic', async () => {
  // let calledSearch = 0
  let calledFind = 0
  let calledGet = 0
  const createStore = defineStore({
    users: defineCollection({
      onFetch(query) {
        // console.log('onFetch', query)
        return new Promise(resolve => {
          if (query) {
            // if (query.$search) {
            //   ++calledSearch
            //   return resolve([{ _id: 'u3', name: `${query.$search} Simon` }])
            // }

            const ids = getQueryIds(query)
            if (ids) {
              ++calledGet
              // console.log('onFetch get', ids, calledGet)
              return resolve(
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
          return resolve([{ _id: 'u2', name: `${this.name} Eric` }])
        })
      },
    }),
  })
  const dv = createStore()

  // normal get
  expect(dv.users.get('u1')).toBe(undefined)
  await dv.getPromise()
  expect(dv.users.get('u1')).toEqual({ _id: 'u1', name: 'u1 name' })

  // find again will same as search
  expect(dv.users.find({}, { sort: { _id: 1 } })).toEqual([{ _id: 'u1', name: 'u1 name' }])
  await dv.getPromise()
  expect(dv.users.find({}, { sort: { _id: 1 } })).toEqual([{ _id: 'u1', name: 'u1 name' }, { _id: 'u2', name: 'users Eric' }])

  expect(calledGet).toBe(1)
  // won't affect calledGet, because search or find will fill individual cacheTimes
  dv.users.get('u2')
  await dv.getPromise()
  expect(calledGet).toBe(1)

  // load something missing
  dv.users.get('not_exists')
  await dv.getPromise()
  expect(calledGet).toBe(2)

  // load local won't affect
  dv.users.get('u1')
  expect(calledGet).toBe(2)

  expect(calledFind).toBe(1)
  expect(calledGet).toBe(2)
  expect(dv.users.getState()).toEqual({
    u1: { _id: 'u1', name: 'u1 name' },
    u2: { _id: 'u2', name: 'users Eric' },
  })
})
