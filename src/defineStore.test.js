import mutate from 'immutability-helper'

import { defineStore } from '.'
import KeyValueStore from './KeyValueStore'

test('get & set', async () => {
  const createStore = defineStore({
    users: KeyValueStore,
  })
  const db = createStore()
  expect(db.users.get('u1')).toBe(undefined)
  db.users.set('u1', 'Hi')
  expect(db.users.get('u1')).toBe('Hi')
})

test('syntax', async () => {
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
  const createStore = defineStore(definitions)
  const db = createStore()
  expect(typeof db.transfers.get === 'function').toBe(true)
  expect(typeof db.transfers.draft === 'function').toBe(true)
  expect(db.transfers.get()).toBe('users x I am first layer draft')

  const createStore2 = defineStore({
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
  expect(db2.transfers.users).toBe(db2.users)
  expect(db2.transfers2.get()).toBe('> users x I am first layer draft <')

  // await
  expect(await db2.transfers2.asyncGet()).toBe('Http Body')
})

test('util', async () => {
  const data = { a: 1 }
  const newData = mutate(data, { a: { $set: 1 } })
  expect(data === newData).toBe(true)
})
