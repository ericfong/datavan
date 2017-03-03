import _ from 'lodash'
import should from 'should'

import {defineCollections, composeClass} from '.'
import Collection from './Collection'
import submitter from './submitter'
import fetcher from './fetcher'


describe('submitter', function() {
  it('basic', async () => {
    const createStore = defineCollections({
      users: composeClass(
        {idField: 'id'},
        fetcher({
          find() {
            return Promise.resolve([{id: 'u2', name: this.name + ' Eric'}])
          },
          get() {
            return Promise.resolve({id: 'u1', name: 'John'})
          },
        }),
        submitter(),
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
