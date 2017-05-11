import _ from 'lodash'

import { defineStore, defineCollection } from '.'

test('onSubmit', async () => {
  let lastSubmit
  const createStore = defineStore({
    users: defineCollection({
      onSubmit(changes) {
        // console.log('>>', changes)
        lastSubmit = changes
        return false
      },
      onFetch(query) {
        if (query && query.id) {
          return Promise.resolve([{ id: 'u1', name: 'John' }])
        }
        return Promise.resolve([{ id: 'u2', name: this.name + ' Eric' }])
      },
    }),
  })
  const db = createStore()

  db.users.insert({ name: 'Apple' })
  const oneObjKey = _.first(Object.keys(lastSubmit))
  expect(lastSubmit[oneObjKey]).toMatchObject({ name: 'Apple' })

  db.users.insert({ name: 'Car' })
  const keys = Object.keys(lastSubmit)
  expect(lastSubmit[keys[1]]).toMatchObject({ name: 'Car' })

  db.users.update({ name: 'Car' }, { $merge: { name: 'Car 2' } })
  expect(lastSubmit[Object.keys(lastSubmit)[1]]).toMatchObject({ name: 'Car 2' })

  // console.log('============= feedback ==============')

  // feedback
  db.users.onSubmit = function(changes) {
    return _.map(changes, doc => ({ ...doc, _id: `stored-${Math.random()}` }))
  }
  db.users.update({ name: 'Car 2' }, { $merge: { name: 'Car 3' } })
  // console.log(db.users.getState())
  expect(_.map(db.users.getState(), 'name').sort()).toEqual(['Apple', 'Car 3'])
  expect(_.isEmpty(db.users.getStagingState())).toBe(true)
})

test('basic', async () => {
  const createStore = defineStore({
    users: defineCollection({
      idField: 'id',
      onFetch(query) {
        if (query && query.id) {
          return Promise.resolve([{ id: 'u1', name: 'John' }])
        }
        return Promise.resolve([{ id: 'u2', name: this.name + ' Eric' }])
      },
    }),
  })
  const db = createStore()

  db.users.insert({ name: 'Apple' })
  db.users.insert({ name: 'Car' })
  expect(_.map(db.users.getState(), 'name')).toEqual(['Apple', 'Car'])
  expect(_.map(db.users.getStagingState(), 'name')).toEqual(['Apple', 'Car'])

  // find and update
  const car = db.users.findOne({ name: 'Car' })
  db.users.update({ id: car.id }, { $merge: { name: 'Car 2' } })
  expect(_.map(db.users.getStagingState(), 'name')).toEqual(['Apple', 'Car 2'])

  // mix data from server
  db.users.get('u1')
  await db.getPromise()
  expect(_.map(db.users.getState(), 'name')).toEqual(expect.arrayContaining(['users Eric', 'John', 'Apple', 'Car 2']))
})
