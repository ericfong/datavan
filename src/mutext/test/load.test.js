import _ from 'lodash'

import { createDb, genTmpId } from '..'
import { onFetchEcho } from './test-util'

test('load same $submittedIds again', async () => {
  const db = createDb({ users: {} })
  const tmpId = genTmpId()

  db.users.load({ [tmpId]: { _id: tmpId, name: 'tmp' } })
  expect(db.users.getById()).toEqual({ [tmpId]: { _id: tmpId, name: 'tmp' } })

  const storedId = 'storedId'
  const byId = { [storedId]: { _id: storedId, tmpId, name: 'tmp' } }
  const $submittedIds = { [tmpId]: storedId }
  db.users.load({ byId, $submittedIds })
  expect(db.users.getSubmits()).toEqual({})
  expect(db.users.getOriginals()).toEqual({})
  expect(db.users.getById()).toEqual({ [storedId]: { _id: storedId, tmpId, name: 'tmp' } })

  // load again won't overwrite storedId doc by null
  db.users.load({ byId, $submittedIds })
  expect(db.users.getById()).toEqual({ [storedId]: { _id: storedId, tmpId, name: 'tmp' } })
})

test('save&load will not re-fetch by ids', async () => {
  // get serverUsers state
  const onFetch = jest.fn(onFetchEcho)
  const db1 = createDb({ users: { onFetch } })
  db1.users.find(['a', 'b', 'c'])
  db1.users.find({ name: 'A' })
  await db1.users.getPending()

  // new browser collection
  const db = createDb({ users: { onFetch, initState: db1.users } })
  expect(db.users.getById()).toEqual({
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
  db.users.find(['a', 'b', 'c'])
  db.users.find({ name: 'A' })
  expect(onFetch).toHaveBeenCalledTimes(0)

  // Won't re-fetch for id query
  db.users.find(['a', 'b'])
  expect(onFetch).toHaveBeenCalledTimes(0)
  db.users.get('a')
  expect(onFetch).toHaveBeenCalledTimes(0)

  // Will re-fetch for not-fetch before
  db.users.get('x')
  expect(onFetch).toHaveBeenCalledTimes(1)
})

test('load stored data sync', async () => {
  const onChange = jest.fn()
  const db = createDb(
    {
      users: {
        cast(doc) {
          doc.dateAt = new Date(doc.dateAt)
          // console.log('>>cast>', doc)
          return doc
        },
      },
    },
    _db => {
      return {
        ..._db,
        onChange,
      }
    }
  )
  db.loadCollections({
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

  // get, set before rehydrate
  db.users.insert({ ...db.users.get('t1'), num: 2 })
  expect(onChange).toHaveBeenCalledTimes(2)
  expect(db.users.get('t1')).toMatchObject({ name: 'customize idField', num: 2 })
  expect(db.users.get('t1').dateAt instanceof Date).toBe(true)
  expect(db.users.get('t1').dateAt.toISOString()).toBe('2017-09-01T01:00:00.000Z')
  expect(onChange).toHaveBeenCalledTimes(2)

  // rehydrate
  db.loadCollections({
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
  expect(db.users.getPreloads().t1).toMatchObject({
    name: 'new',
    rehydrate: 1,
    num: 1,
    done: 0,
  })
  expect(db.users.getPreloads().t1.dateAt instanceof Date).toBe(true)
  expect(db.users.getPreloads().t1.dateAt.toISOString()).toBe('2017-10-01T01:00:00.000Z')
  expect(onChange).toHaveBeenCalledTimes(3)
})

test('load', async () => {
  const db = createDb({ users: {} })
  db.users.load({ byId: { a: { x: 1, y: 1 } } })
  expect(db.users.getById()).toEqual({ a: { x: 1, y: 1 } })
  db.users.load({ byId: { a: { x: 2 }, b: null } })
  expect(db.users.getById()).toEqual({ a: { x: 2, y: 1 }, b: null })
})
