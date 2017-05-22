import { defineStore } from '.'
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
  db1.setContext({ duringMapState: true })

  expect(db1.users.get('u1')).toBe(undefined)
  db1.users.set('u1', 'hi')
  expect(db1.users.get('u1')).toBe('hi')

  // should access global localStorage
  const db2 = createStore()
  db2.setContext({ duringMapState: true })
  expect(db2.users.get('u1')).toBe('hi')
  db2.users.set('u1', 'world')

  // db1 should get new state in Sync
  expect(db1.users.get('u1')).toBe('world')
})
