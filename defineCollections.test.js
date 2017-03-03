import should from 'should'
import mutate from 'immutability-helper'

import {defineCollections} from '.'
import KeyValueStore from './KeyValueStore'

describe('defineCollections', function() {
  it('get & set', async () => {
    const createStore = defineCollections({
      users: KeyValueStore,
    })
    const db = createStore()
    should( db.users.get('u1') ).equal(undefined)
    db.users.set('u1', 'Hi')
    should( db.users.get('u1') ).equal('Hi')
  })

  it('syntax', async () => {
    const definitions = {
      transfers: {
        getRequires: () => ['users'],
        draft() {
          return ' I am first layer draft'
        },
        get() {
          return this.users.get() + ' x' + this.draft()
        },
      },
      users: {
        get() {
          return 'users'
        },
      },
    }
    const createStore = defineCollections(definitions)
    const db = createStore()
    should(typeof db.transfers.get === 'function').true()
    should(typeof db.transfers.draft === 'function').true()
    should( db.transfers.get() ).equal('users x I am first layer draft')

    const createStore2 = defineCollections({
      ...definitions,
      transfers2: {
        getRequires: () => ['transfers'],
        get() {
          return `> ${this.transfers.get()} <`
        },
        asyncGet() {
          return new Promise(resolve => setTimeout(() => resolve('Http Body'), 1))
        },
      },
    })
    const db2 = createStore2()
    should( db2.transfers.users ).equal(db2.users)
    should( db2.transfers2.get() ).equal('> users x I am first layer draft <')

    // await
    should( await db2.transfers2.asyncGet() ).equal('Http Body')
  })

  it('util', async () => {
    const data = {a: 1}
    const newData = mutate(data, {a: {$set: 1}})
    should(data === newData).true()
  })
})
