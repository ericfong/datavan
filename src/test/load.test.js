import _ from 'lodash'

import { createDb, genTmpId } from '..'
import { onFetchEcho } from './test-util'

test('load collections', async () => {
  const db = createDb({ t1: {}, t2: {} })
  db.load({
    t1: [{ _id: 'a' }, { _id: 'b' }],
    t2: null, // can load collections with some falsy
  })
  expect(_.keys(db.t1.preloads).sort()).toEqual(['a', 'b'])
  expect(_.keys(db.t2.preloads).sort()).toEqual([])
})

test('load same $submittedIds again', async () => {
  const db = createDb({ users: {} })
  const tmpId = genTmpId()

  db.load('users', { submits: { [tmpId]: { _id: tmpId, name: 'tmp' } } })
  expect(db.getSubmits('users')).toEqual({ [tmpId]: { _id: tmpId, name: 'tmp' } })
  expect(db.getById('users')).toEqual({ [tmpId]: { _id: tmpId, name: 'tmp' } })

  const storedId = 'storedId'
  const byId = { [storedId]: { _id: storedId, tmpId, name: 'tmp' } }
  const $submittedIds = { [tmpId]: storedId }
  db.load('users', { byId, $submittedIds })
  expect(db.getSubmits('users')).toEqual({})
  expect(db.getOriginals('users')).toEqual({})
  expect(db.getById('users')).toEqual({ [storedId]: { _id: storedId, tmpId, name: 'tmp' } })

  // load again won't overwrite storedId doc by null
  db.load('users', { byId, $submittedIds })
  expect(db.getById('users')).toEqual({ [storedId]: { _id: storedId, tmpId, name: 'tmp' } })
})

test('save&load will not re-fetch by ids', async () => {
  // get serverUsers state
  const onFetch = jest.fn(onFetchEcho)
  const db1 = createDb({ users: { onFetch } })
  db1.find('users', ['a', 'b', 'c'])
  db1.find('users', { name: 'A' })
  await db1.getPending('users')

  // new browser collection
  const db = createDb({ users: { onFetch, initState: db1.users } })
  expect(db.getById('users')).toEqual({
    a: { _id: 'a', name: 'A' },
    b: { _id: 'b', name: 'B' },
    c: { _id: 'c', name: 'C' },
  })
  expect(_.keys(db.users.fetchAts)).toEqual(['{"_id":{"$in":["a","b","c"]}}', '{"name":"A"}'])
  expect(_.keys(db.users._byIdAts)).toEqual(['a', 'b', 'c'])

  // reset
  onFetch.mockClear()
  expect(onFetch).toHaveBeenCalledTimes(0)

  // Won't re-fetch in new store
  db.find('users', ['a', 'b', 'c'])
  db.find('users', { name: 'A' })
  expect(onFetch).toHaveBeenCalledTimes(0)

  // Won't re-fetch for id query
  db.find('users', ['a', 'b'])
  expect(onFetch).toHaveBeenCalledTimes(0)
  db.get('users', 'a')
  expect(onFetch).toHaveBeenCalledTimes(0)

  // Will re-fetch for not-fetch before
  db.get('users', 'x')
  expect(onFetch).toHaveBeenCalledTimes(1)
})

test('load stored data sync', async () => {
  const db = createDb({
    users: {
      cast(doc) {
        doc.dateAt = new Date(doc.dateAt)
        // console.log('>>cast>', doc)
        return doc
      },
    },
  })
  const onChange = jest.fn()
  db.subscribe(onChange)
  db.load({
    users: {
      preloads: {
        t1: {
          _id: 't1',
          name: 'customize idField',
          num: 1,
          dateAt: '2017-09-01T01:00:00Z',
          done: 0,
        },
      },
    },
  })
  expect(onChange).toHaveBeenCalledTimes(1)

  // get, set before rehydrate
  db.insert('users', { ...db.get('users', 't1'), num: 2 })
  expect(onChange).toHaveBeenCalledTimes(2)
  expect(db.get('users', 't1')).toMatchObject({ name: 'customize idField', num: 2 })
  expect(db.get('users', 't1').dateAt instanceof Date).toBe(true)
  expect(db.get('users', 't1').dateAt.toISOString()).toBe('2017-09-01T01:00:00.000Z')
  expect(onChange).toHaveBeenCalledTimes(2)

  // rehydrate
  db.load({
    users: {
      byId: {
        t1: {
          id: 't1',
          name: 'new',
          rehydrate: 1,
          dateAt: '2017-10-01T01:00:00Z',
        },
      },
    },
  })
  expect(onChange).toHaveBeenCalledTimes(3)
  expect(db.getPreloads('users').t1).toMatchObject({
    name: 'new',
    rehydrate: 1,
    num: 1,
    done: 0,
  })
  expect(db.getPreloads('users').t1.dateAt instanceof Date).toBe(true)
  expect(db.getPreloads('users').t1.dateAt.toISOString()).toBe('2017-10-01T01:00:00.000Z')
  expect(onChange).toHaveBeenCalledTimes(3)
})

test('load', async () => {
  const db = createDb({ users: {} })
  db.load('users', { byId: { a: { x: 1, y: 1 } } })
  expect(db.getById('users')).toEqual({ a: { x: 1, y: 1 } })
  db.load('users', { byId: { a: { x: 2 }, b: null } })
  expect(db.getById('users')).toEqual({ a: { x: 2, y: 1 }, b: null })
})
