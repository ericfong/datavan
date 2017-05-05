import should from 'should'

import {defineStore} from '.'
import LocalStorage from './LocalStorage'

global.localStorage = {
  getItem(id) {
    return this[id]
  },
  setItem(id, v) {
    this[id] = v
  },
}

it('basic', async () => {
  const createStore = defineStore({
    users: LocalStorage,
  })
  const db1 = createStore()

  should( db1.users.get('u1') ).equal(undefined)
  db1.users.set('u1', 'hi')
  should( db1.users.get('u1') ).equal('hi')

  // should access global localStorage
  const db2 = createStore()
  should( db2.users.get('u1') ).equal('hi')
  db2.users.set('u1', 'world')
  // db1 should get new state sync
  should( db1.users.get('u1') ).equal('world')
})
