import _ from 'lodash'

import { defineStore, defineCollection } from '.'

const getOne = lastSubmit => lastSubmit[_.last(Object.keys(lastSubmit))]

test('onSubmit', async () => {
  let lastSubmit
  const createStore = defineStore({
    users: defineCollection({
      onSubmit(changes) {
        lastSubmit = changes
        return false
      },
      onFetch(query) {
        if (Array.isArray(query)) {
          return Promise.resolve(_.map(query, id => ({ id, name: 'John' })))
        }
        return Promise.resolve([{ id: 'u2', name: `${this.name} Eric` }])
      },
    }),
  })
  const db = createStore()

  db.users.insert({ name: 'Apple' })
  expect(_.size(lastSubmit)).toBe(1)
  expect(getOne(lastSubmit)).toMatchObject({ name: 'Apple' })

  db.users.insert({ name: 'Car' })
  expect(_.size(lastSubmit)).toBe(2)
  expect(getOne(lastSubmit)).toMatchObject({ name: 'Car' })

  db.users.update({ name: 'Car' }, { $merge: { name: 'Car 2' } })
  expect(_.size(lastSubmit)).toBe(2)
  expect(getOne(lastSubmit)).toMatchObject({ name: 'Car 2' })

  const removeDoc = db.users.insert({ name: 'Remove' })
  expect(db.users.get(removeDoc._id)).toBe(removeDoc)
  // remove
  db.users.remove({ name: 'Remove' })
  // have a id set to undefined
  expect(_.size(db.users.getStagingState())).toBe(3)
  expect(db.users.get(removeDoc._id)).toBe(undefined)

  // onSubmit with feedback

  db.users.onSubmit = changes => {
    lastSubmit = changes
    return _.reduce(
      changes,
      (ret, doc) => {
        if (doc) {
          ret.push({ ...doc, _id: `stored-${Math.random()}` })
        }
        return ret
      },
      []
    )
  }
  db.users.update({ name: 'Car 2' }, { $merge: { name: 'Car 3' } })
  // all changes submitted
  expect(_.size(lastSubmit)).toBe(3)
  expect(_.compact(_.map(db.users.getState(), 'name')).sort()).toEqual(['Apple', 'Car 3'])
  expect(_.isEmpty(db.users.getStagingState())).toBe(true)
})

test('basic', async () => {
  const createStore = defineStore({
    users: defineCollection({
      idField: 'id',
      onFetch(query) {
        if (Array.isArray(query)) {
          return Promise.resolve(_.map(query, id => ({ id, name: 'John' })))
        }
        return Promise.resolve([{ id: 'u2', name: `${this.name} Eric` }])
      },
    }),
  })
  const dv = createStore()

  dv.users.insert({ name: 'Apple' })
  dv.users.insert({ name: 'Car' })
  expect(_.map(dv.users.getState(), 'name')).toEqual(['Apple', 'Car'])
  expect(_.map(dv.users.getStagingState(), 'name')).toEqual(['Apple', 'Car'])

  // find and update
  const car = dv.users.findOne({ name: 'Car' })
  dv.users.update({ id: car.id }, { $merge: { name: 'Car 2' } })
  expect(_.map(dv.users.getStagingState(), 'name')).toEqual(['Apple', 'Car 2'])

  // mix data from server
  dv.users.get('u1')
  await dv.getPromise()
  expect(_.map(dv.users.getState(), 'name')).toEqual(expect.arrayContaining(['users Eric', 'John', 'Apple', 'Car 2']))
})
