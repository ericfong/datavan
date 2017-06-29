import { defineStore } from '.'
import LocalStorage from './LocalStorage'

global.localStorage = {
  getItem(id) {
    // NOTE getItem(id) return null instead of undefined?
    // localStorage[id] return undefined
    return this[id] || null
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

  expect(dvLeft.users.get('u1')).toBe(null)
  dvLeft.users.set('u1', 'hi')
  expect(dvLeft.users.get('u1')).toBe('hi')

  // console.log('>>> dvRight')

  // should access global localStorage
  const dvRight = createStore()
  expect(dvRight.users.get('u1')).toBe('hi')
  dvRight.users.set('u1', 'world')

  // console.log('>>> dvLeft')

  // dvLeft should get new state, which set by dvRight in Sync
  expect(dvLeft.users.get('u1')).toBe('world')
})
