import _ from 'lodash'

import { defineStore, composeClass, Searchable } from '.'
import Collection from './Collection'
import Fetcher from './Fetcher'

global.__DEV__ = true

const getQueryIds = query => (Array.isArray(query._id.$in) ? query._id.$in : [query._id])

test('sync get', async () => {
  const createStore = defineStore({
    users: composeClass(
      {
        onFetch(query) {
          const ids = getQueryIds(query)
          const ret = _.map(ids, _id => ({ _id, name: `Echo-${_id}` }))
          return ret
        },
      },
      Fetcher,
      Collection
    ),
  })
  const db = createStore()

  expect(db.users.get('1')).toEqual({ _id: '1', name: 'Echo-1' })
  expect(db.users.get('2')).toEqual({ _id: '2', name: 'Echo-2' })
  expect(db.users.getPromise()).toBe(null)

  _.each(db.users, (val, key) => {
    if (key !== '_store' && (Array.isArray(val) || typeof val === 'object')) {
      // console.log(key, val)
      expect(_.isEmpty(val)).toBe(true)
    }
  })
})

test('batch get failback to find', async () => {
  const createStore = defineStore({
    users: composeClass(
      {
        onFetch(query) {
          const ids = getQueryIds(query)
          return Promise.resolve(
            _.map(ids, _id => {
              // console.log('onFetch done', {_id, name: 'Echo-' + _id})
              return { _id, name: 'Echo-' + _id }
            })
          )
        },
      },
      Fetcher,
      Collection
    ),
  })
  const db = createStore()
  db.setContext({ duringMapState: false })

  db.users.get('1')
  const p1 = db.users.findOne({ _id: '2' }, { load: 'load' })
  const p2 = db.users.findOne({ _id: '3' }, { load: 'reload' })
  await db.users.getPromise()
  expect(db.users.get('1')).toEqual({ _id: '1', name: 'Echo-1' })
  expect(await Promise.all([p1, p2])).toEqual([{ _id: '2', name: 'Echo-2' }, { _id: '3', name: 'Echo-3' }])
})

test('basic', async () => {
  let calledSearch = 0, calledFind = 0, calledGet = 0
  const createStore = defineStore({
    users: composeClass(
      {
        onFetch(query) {
          // console.log('onFetch', query)
          if (query) {
            if (query.$search) {
              ++calledSearch
              return Promise.resolve([{ _id: 'u3', name: query.$search + ' Simon' }])
            } else if (query._id) {
              ++calledGet
              const ids = getQueryIds(query)
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
          return Promise.resolve([{ _id: 'u2', name: this.name + ' Eric' }])
        },
      },
      Fetcher,
      Searchable,
      Collection
    ),
  })
  const store = createStore()
  store.setContext({ duringMapState: true })

  // normal get
  expect(store.users.get('u1')).toBe(undefined)
  await store.getPromise()
  expect(store.users.get('u1')).toEqual({ _id: 'u1', name: 'u1 name' })

  // search
  expect(store.users.search('hi')).toEqual([])
  await store.getPromise()
  expect(store.users.search('hi')).toEqual([{ _id: 'u3', name: 'hi Simon' }])

  // find again will same as search
  expect(store.users.find(null, { sort: { _id: 1 } })).toEqual([{ _id: 'u1', name: 'u1 name' }, { _id: 'u3', name: 'hi Simon' }])
  await store.getPromise()
  expect(store.users.find(null, { sort: { _id: 1 } })).toEqual([
    { _id: 'u1', name: 'u1 name' },
    { _id: 'u2', name: 'users Eric' },
    { _id: 'u3', name: 'hi Simon' },
  ])

  // won't affect calledGet, because search or find will fill individual cacheTimes
  expect(calledGet).toBe(1)
  store.users.get('u3', { load: 'load' })
  expect(calledGet).toBe(1)

  // load something missing
  store.users.get('not_exists')
  await store.getPromise()
  expect(calledGet).toBe(2)

  // load local won't affect
  store.users.get('u5', { load: 'local' })
  expect(calledGet).toBe(2)

  expect(calledSearch).toBe(1)
  expect(calledFind).toBe(1)
  expect(calledGet).toBe(2)
  expect(store.users.getState()).toEqual({
    u1: { _id: 'u1', name: 'u1 name' },
    u2: { _id: 'u2', name: 'users Eric' },
    u3: { _id: 'u3', name: 'hi Simon' },
  })
})
