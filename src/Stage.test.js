import _ from 'lodash'
import should from 'should'

import {defineStore, composeClass} from '.'
import Collection from './Collection'
import Stage from './Stage'
import Fetcher from './Fetcher'


describe('Stage', function() {
  it('basic', async () => {
    const createStore = defineStore({
      users: composeClass(
        {
          idField: 'id',
          findFetch(query) {
            if (query && query.id) {
              return Promise.resolve([{id: 'u1', name: 'John'}])
            }
            return Promise.resolve([{id: 'u2', name: this.name + ' Eric'}])
          },
        },
        Fetcher,
        Stage,
        Collection,
      ),
    })
    const db = createStore()

    db.users.insert({name: 'Apple'})
    db.users.insert({name: 'Car'})
    should( _.map(db.users.getState(), 'name') ).deepEqual(['Apple', 'Car'])
    should( _.map(db.users.getStagingState(), 'name') ).deepEqual(['Apple', 'Car'])

    // sideLoader will call find
    const car = db.users.findOne({name: 'Car'})
    db.users.update({id: car.id}, {$set: {name: 'Car 2'}})
    const storeState = db.getState()
    should( _.isEmpty(storeState.users) ).true()

    should( _.map(storeState.users_staging, 'name') ).deepEqual(['Apple', 'Car 2'])
    should( _.map(db.users.getStagingState(), 'name') ).deepEqual(['Apple', 'Car 2'])

    // mix data from server
    db.users.get('u1')
    await db.getPromise()
    should( _.map(db.users.getState(), 'name') ).deepEqual(['users Eric', 'John', 'Apple', 'Car 2'])
  })
})
