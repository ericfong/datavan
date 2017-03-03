import should from 'should'

import {defineCollections, composeClass} from '.'
import SearchableCollection from './SearchableCollection'
import fetcher from './fetcher'

global.__DEV__ = true

describe('fetcher', function() {
  it('basic', async () => {
    let calledSearch = 0, calledFind = 0, calledGet = 0
    const createStore = defineCollections({
      users: composeClass(
        {
          searchEngineConfig: {
            // shouldSort: true,
            // tokenize: true,
            // threshold: 0,
            keys: ['name'],
          },
        },
        fetcher({
          search(text) {
            ++calledSearch
            return Promise.resolve([{_id: 'u3', name: text + ' Simon'}])
          },
          find() {
            ++calledFind
            return Promise.resolve([{_id: 'u2', name: this.name + ' Eric'}])
          },
          get(id) {
            ++calledGet
            return Promise.resolve({_id: 'u1', name: `${id} name`})
          },
        }),
        SearchableCollection,
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
    store.users.get('u4')
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
