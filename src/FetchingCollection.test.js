import _ from 'lodash'

import { defineStore, defineCollection } from '.'

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

  // // search
  // expect(dv.users.search('hi')).toEqual([])
  // await dv.getPromise()
  // expect(dv.users.search('hi')).toEqual([{ _id: 'u3', name: 'hi Simon' }])

  // find again will same as search
  expect(dv.users.find(null, { sort: { _id: 1 } })).toEqual([{ _id: 'u1', name: 'u1 name' }])
  await dv.getPromise()
  expect(dv.users.find(null, { sort: { _id: 1 } })).toEqual([{ _id: 'u1', name: 'u1 name' }, { _id: 'u2', name: 'users Eric' }])

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

  // expect(calledSearch).toBe(0)
  expect(calledFind).toBe(1)
  expect(calledGet).toBe(2)
  expect(dv.users.getState()).toEqual({
    u1: { _id: 'u1', name: 'u1 name' },
    u2: { _id: 'u2', name: 'users Eric' },
  })
})
