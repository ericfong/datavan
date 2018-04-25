import _ from 'lodash'

import createDb from '../db'
import { forkDb } from '../db-util'
import { onFetchEcho } from './test-util'

test('invalidate & reset', async () => {
  const dbRoot = createDb({ myTable: { onFetch: onFetchEcho } })
  await dbRoot.findAsync('myTable', ['root-preload'])
  dbRoot.insert('myTable', { _id: 'root-insert' })

  const db2 = forkDb(dbRoot)
  await db2.findAsync('myTable', ['db2-preload'])
  db2.insert('myTable', { _id: 'db2-insert' })

  expect(_.keys(dbRoot.myTable.submits).sort()).toEqual(['root-insert'])
  expect(_.keys(dbRoot.myTable.preloads).sort()).toEqual(['db2-preload', 'root-preload'])
  expect(_.keys(db2.myTable.submits).sort()).toEqual(['db2-insert', 'root-insert'])
  expect(_.keys(db2.myTable.preloads).sort()).toEqual([])

  db2.reset('myTable', null, { submitsOnly: 1 })
  expect(_.keys(dbRoot.myTable.submits).sort()).toEqual(['root-insert'])
  expect(_.keys(dbRoot.myTable.preloads).sort()).toEqual(['db2-preload', 'root-preload'])
  expect(_.keys(db2.myTable.submits).sort()).toEqual([])
  expect(_.keys(db2.myTable.preloads).sort()).toEqual([])

  db2.invalidate('myTable')
  expect(_.keys(dbRoot.myTable.submits).sort()).toEqual(['root-insert'])
  expect(_.keys(dbRoot.myTable.preloads).sort()).toEqual([])
  expect(_.keys(db2.myTable.submits).sort()).toEqual([])
  expect(_.keys(db2.myTable.preloads).sort()).toEqual([])

  db2.reset('myTable')
  expect(_.keys(dbRoot.myTable.submits).sort()).toEqual(['root-insert'])
  expect(_.keys(dbRoot.myTable.preloads).sort()).toEqual([])
  expect(_.keys(db2.myTable.submits).sort()).toEqual([])
  expect(_.keys(db2.myTable.preloads).sort()).toEqual([])

  dbRoot.reset('myTable')
  expect(_.keys(dbRoot.myTable.submits).sort()).toEqual([])
  expect(_.keys(dbRoot.myTable.preloads).sort()).toEqual([])
  expect(_.keys(db2.myTable.submits).sort()).toEqual([])
  expect(_.keys(db2.myTable.preloads).sort()).toEqual([])
})

test('insert & mutate', async () => {
  const dbRoot = createDb({ myTable: {} })
  dbRoot.insert('myTable', { _id: 'root' })

  const db2 = forkDb(dbRoot)
  const db3 = forkDb(dbRoot)

  db2.insert('myTable', { _id: 'db2' })
  db3.insert('myTable', { _id: 'db3' })

  expect(_.keys(dbRoot.myTable.submits).sort()).toEqual(['root'])
  expect(_.keys(db2.myTable.submits).sort()).toEqual(['db2', 'root'])
  expect(_.keys(db3.myTable.submits).sort()).toEqual(['db3', 'root'])
})

test('preloads', async () => {
  const onFetch = jest.fn(onFetchEcho)
  const dbRoot = createDb({ myTable: { onFetch } })
  const db2 = forkDb(dbRoot)
  const db3 = forkDb(dbRoot)

  expect(onFetch).toHaveBeenCalledTimes(0)
  await dbRoot.findAsync('myTable', ['a', 'b'])
  expect(onFetch).toHaveBeenCalledTimes(1)
  expect(_.keys(dbRoot.myTable.preloads).sort()).toEqual(['a', 'b'])
  expect(_.keys(db2.myTable.preloads).sort()).toEqual([])
  expect(_.keys(db3.myTable.preloads).sort()).toEqual([])
  expect(_.keys(db2.getPreloads('myTable')).sort()).toEqual(['a', 'b'])
  expect(_.keys(db3.getPreloads('myTable')).sort()).toEqual(['a', 'b'])

  await db2.findAsync('myTable', ['x', 'y'])
  expect(onFetch).toHaveBeenCalledTimes(2)
  expect(_.keys(dbRoot.myTable.preloads).sort()).toEqual(['a', 'b', 'x', 'y'])
  expect(_.keys(db2.myTable.preloads).sort()).toEqual([])
  expect(_.keys(db3.myTable.preloads).sort()).toEqual([])

  expect(db2.findInMemory('myTable', { name: 'X' })).toEqual([{ _id: 'x', name: 'X' }])
  expect(db3.findInMemory('myTable', { name: 'X' })).toEqual([{ _id: 'x', name: 'X' }])

  expect(db2.find('myTable', ['x'])).toEqual([{ _id: 'x', name: 'X' }])
  expect(onFetch).toHaveBeenCalledTimes(2)
})
