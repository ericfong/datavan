import _ from 'lodash'

import { defineStore, composeClass } from '.'
import Collection from './Collection'
import Stage from './Stage'
import Fetcher from './Fetcher'

describe('Stage', function() {
  it('basic', async () => {
    const createStore = defineStore({
      users: composeClass(
        {
          idField: 'id',
          onFetch(query) {
            if (query && query.id) {
              return Promise.resolve([{ id: 'u1', name: 'John' }])
            }
            return Promise.resolve([{ id: 'u2', name: this.name + ' Eric' }])
          },
        },
        Stage,
        Fetcher,
        Collection
      ),
    })
    const db = createStore()

    db.users.insert({ name: 'Apple' })
    db.users.insert({ name: 'Car' })
    expect(_.map(db.users.getState(), 'name')).toEqual(['Apple', 'Car'])
    expect(_.map(db.users.getStagingState(), 'name')).toEqual(['Apple', 'Car'])

    // sideLoader will call find
    const car = db.users.findOne({ name: 'Car' })
    console.log(car.id)
    db.users.update({ id: car.id }, { $merge: { name: 'Car 2' } })
    const storeState = db.getState()
    expect(_.isEmpty(storeState.users)).toBe(true)

    expect(_.map(storeState.users_staging, 'name')).toEqual(['Apple', 'Car 2'])
    expect(_.map(db.users.getStagingState(), 'name')).toEqual(['Apple', 'Car 2'])

    // mix data from server
    db.users.get('u1')
    await db.getPromise()
    expect(_.map(db.users.getState(), 'name')).toEqual(['users Eric', 'John', 'Apple', 'Car 2'])
  })
})
