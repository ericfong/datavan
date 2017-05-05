import _ from 'lodash'
import should from 'should'

import {defineStore, composeClass, Searchable} from '.'
import Collection from './Collection'
import Fetcher from './Fetcher'

global.__DEV__ = true

test('batch get failback to find', async () => {
  const createStore = defineStore({
    users: composeClass(
      {
        findFetch(query) {
          return Promise.resolve(_.map(query._id.$in, _id => {
            return {_id, name: 'Echo-' + _id}
          }))
        },
      },
      Fetcher,
      Collection,
    ),
  })
  const db = createStore()

  db.users.get('1')
  const p1 = db.users.get('2', {load: 'load'})
  const p2 = db.users.get('3', {load: 'reload'})
  await db.users.getPromise()
  expect( db.users.get('1') ).toEqual({_id: '1', name: 'Echo-1'})
  expect( await Promise.all([p1, p2]) ).toEqual([
    {_id: '2', name: 'Echo-2'},
    {_id: '3', name: 'Echo-3'},
  ])
})

describe('fetcher', function() {
  it('basic', async () => {
    let calledSearch = 0, calledFind = 0, calledGet = 0
    const createStore = defineStore({
      users: composeClass(
        {
          findFetch(query) {
            if (query) {
              if (query.$search) {
                ++calledSearch
                return Promise.resolve([{_id: 'u3', name: query.$search + ' Simon'}])
              } else if (query._id) {
                ++calledGet
                const id = _.first(query._id.$in)
                if (id === 'not_exists') {
                  return Promise.resolve([])
                }
                return Promise.resolve([{_id: id, name: `${id} name`}])
              }
            }
            ++calledFind
            return Promise.resolve([{_id: 'u2', name: this.name + ' Eric'}])
          },
        },
        Fetcher,
        Searchable,
        Collection,
      ),
    })
    const store = createStore()

    should( store.users.search('hi') ).deepEqual([])
    await store.getPromise()
    should( store.users.search('hi') ).deepEqual([{_id: 'u3', name: 'hi Simon'}])

    should( store.users.find(null, {sort: {_id: 1}}) )
    .deepEqual([{_id: 'u3', name: 'hi Simon'}])
    await store.getPromise()
    should( store.users.find(null, {sort: {_id: 1}}) ).deepEqual([{_id: 'u2', name: 'users Eric'}, {_id: 'u3', name: 'hi Simon'}])

    should( store.users.get('u1') ).equal(undefined)
    await store.getPromise()
    should( store.users.get('u1') ).deepEqual({_id: 'u1', name: 'u1 name'})
    should( store.users.get('u1') ).deepEqual({_id: 'u1', name: 'u1 name'})

    // won't affect calledGet, because search or find will fill individual cacheTimes
    store.users.get('u3', {load: 'load'})
    should( calledGet ).equal(1)

    // load something missing
    store.users.get('not_exists')
    await store.getPromise()
    should( calledGet ).equal(2)

    // load local won't affect
    store.users.get('u5', {load: 'local'})
    should( calledGet ).equal(2)

    should( calledSearch ).equal(1)
    should( calledFind ).equal(1)
    should( calledGet ).equal(2)
    should( store.users.getState() ).deepEqual({
      u1: {_id: 'u1', name: 'u1 name'},
      u2: {_id: 'u2', name: 'users Eric'},
      u3: {_id: 'u3', name: 'hi Simon'},
    })
  })
})
