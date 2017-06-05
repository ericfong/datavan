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
  const dvLeft = createStore()
  dvLeft.context.duringMapState = true

  expect(dvLeft.users.get('u1')).toBe(undefined)
  dvLeft.users.set('u1', 'hi')
  expect(dvLeft.users.get('u1')).toBe('hi')

  // console.log('>>> dvRight')

  // should access global localStorage
  const dvRight = createStore()
  dvRight.context.duringMapState = true
  expect(dvRight.users.get('u1')).toBe('hi')
  dvRight.users.set('u1', 'world')

  // console.log('>>> dvLeft')

  // dvLeft should get new state, which set by dvRight in Sync
  expect(dvLeft.users.get('u1')).toBe('world')
})
