import _ from 'lodash'

import { defineStore, defineCollection, Searchable } from '.'

global.__DEV__ = true

function getQueryIds(query, idField = '_id') {
  if (Array.isArray(query)) return query
  const queryId = query[idField]
  if (queryId) {
    if (Array.isArray(queryId.$in)) return queryId.$in
    return [queryId]
  }
}

test('sync get', async () => {
  const createStore = defineStore({
    users: defineCollection({
      onFetch(query) {
        const ids = getQueryIds(query)
        const ret = _.map(ids, _id => ({ _id, name: `Echo-${_id}` }))
        return ret
      },
    }),
  })
  const db = createStore()
  db.context.duringMapState = false

  expect(db.users.get('1')).toEqual({ _id: '1', name: 'Echo-1' })
  expect(db.users.get('2')).toEqual({ _id: '2', name: 'Echo-2' })
  expect(db.users.getPromise()).toBe(null)

  _.each(db.users, (val, key) => {
    if (key !== 'state' && key !== 'context' && (Array.isArray(val) || typeof val === 'object')) {
      expect(_.isEmpty(val)).toBe(true)
    }
  })
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
  db.context.duringMapState = false

  db.users.get('1')
  const p1 = db.users.load({ _id: '2' }).then(r => r[0])
  const p2 = db.users.reload(['3']).then(r => r[0])
  await db.users.getPromise()
  expect(db.users.get('1')).toEqual({ _id: '1', name: 'Echo-1' })
  expect(await Promise.all([p1, p2])).toEqual([{ _id: '2', name: 'Echo-2' }, { _id: '3', name: 'Echo-3' }])
})

test('basic', async () => {
  let calledSearch = 0
  let calledFind = 0
  let calledGet = 0
  const createStore = defineStore({
    users: defineCollection(
      {
        onFetch(query) {
          // console.log('onFetch', query)
          if (query) {
            if (query.$search) {
              ++calledSearch
              return Promise.resolve([{ _id: 'u3', name: `${query.$search} Simon` }])
            }

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
          return Promise.resolve([{ _id: 'u2', name: `${this.name} Eric` }])
        },
      },
      Searchable
    ),
  })
  const dv = createStore()
  dv.context.duringMapState = true

  // normal get
  expect(dv.users.get('u1')).toBe(undefined)
  await dv.getPromise()
  expect(dv.users.get('u1')).toEqual({ _id: 'u1', name: 'u1 name' })

  // search
  expect(dv.users.search('hi')).toEqual([])
  await dv.getPromise()
  expect(dv.users.search('hi')).toEqual([{ _id: 'u3', name: 'hi Simon' }])

  // find again will same as search
  expect(dv.users.find(null, { sort: { _id: 1 } })).toEqual([{ _id: 'u1', name: 'u1 name' }, { _id: 'u3', name: 'hi Simon' }])
  await dv.getPromise()
  expect(dv.users.find(null, { sort: { _id: 1 } })).toEqual([
    { _id: 'u1', name: 'u1 name' },
    { _id: 'u2', name: 'users Eric' },
    { _id: 'u3', name: 'hi Simon' },
  ])

  expect(calledGet).toBe(1)
  // won't affect calledGet, because search or find will fill individual cacheTimes
  dv.users.get('u3')
  await dv.getPromise()
  expect(calledGet).toBe(1)

  // load something missing
  dv.users.get('not_exists')
  await dv.getPromise()
  expect(calledGet).toBe(2)

  // load local won't affect
  dv.context.duringMapState = false
  dv.users.get('u5')
  dv.context.duringMapState = true
  expect(calledGet).toBe(2)

  expect(calledSearch).toBe(1)
  expect(calledFind).toBe(1)
  expect(calledGet).toBe(2)
  expect(dv.users.getState()).toEqual({
    u1: { _id: 'u1', name: 'u1 name' },
    u2: { _id: 'u2', name: 'users Eric' },
    u3: { _id: 'u3', name: 'hi Simon' },
  })
})