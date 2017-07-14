/* eslint-disable import/no-extraneous-dependencies */
import _ from 'lodash'
import sift from 'sift'
import Nedb from 'nedb'
import Loki from 'lokijs'
import Mingo from 'mingo'
// import { findDirectly } from './Collection'

// @auto-fold here
function time(func, name) {
  const start = Date.now()
  func()
  func()
  const ret = func()
  const timeDiff = (Date.now() - start) / 3

  if (!(Array.isArray(ret) && ret.length > 0)) throw new Error('doFind return ', ret)
  console.log(name, ret)
  // if (name) console.log(`${name}: ${timeDiff}ms`)
  return timeDiff
}

// @auto-fold here
async function timeAsync(func, name) {
  const start = Date.now()
  await func()
  await func()
  const ret = await func()
  const timeDiff = (Date.now() - start) / 3

  if (!(Array.isArray(ret) && ret.length > 0)) throw new Error('doFind return ', ret)
  console.log(name, ret)
  // if (name) console.log(`${name}: ${timeDiff}ms`)
  return timeDiff
}

// @auto-fold here
function wrap(func, scope) {
  return (...args) =>
    new Promise((resolve, reject) => {
      args.push((err, ret) => {
        if (err) reject(err)
        else resolve(ret)
      })
      func.apply(scope, args)
    })
}

// @auto-fold here
const docs = _.map(_.range(10000), i => {
  // const id = `as-${i}`
  const doc = {
    // id,
    parentId: `parent-${i}`,
    deleted: 0,
  }
  // docs[id] = doc
  return doc
})
const simpleCount = 15
const parentIds = _.map(_.range(100, 100 + simpleCount * 10, 10), i => `parent-${i}`)

const result = {}

afterAll(() => {
  console.log('afterAll', JSON.stringify(result, null, '  '))
})

it('sift', () => {
  const start = Date.now()
  const sifter = sift({ parentId: { $in: parentIds }, deleted: 0 })
  result.sift = time(() => _.filter(docs, sifter), 'sift')
  result.siftTotal = Date.now() - start
})

it('nedb', async () => {
  const start = Date.now()
  const coll = new Nedb()
  await wrap(coll.ensureIndex, coll)({ fieldName: 'parentId' })
  await wrap(coll.insert, coll)(docs)
  const find = await wrap(coll.find, coll)
  result.nedb = await timeAsync(() => find({ parentId: { $in: parentIds }, deleted: 0 }), 'nedb')
  result.nedbTotal = Date.now() - start
})

it('loki', () => {
  const start = Date.now()
  const db = new Loki()
  const items = db.addCollection('items', { indices: ['parentId'] })
  items.insert(_.cloneDeep(docs))
  result.loki = time(() => items.find({ parentId: { $in: parentIds }, deleted: 0 }), 'loki')
  result.lokiTotal = Date.now() - start
})

it('mingo', () => {
  const start = Date.now()
  const query = new Mingo.Query({ parentId: { $in: parentIds }, deleted: 0 })
  result.mingo = time(() => query.find(docs).all(), 'mingo')
  result.mingoTotal = Date.now() - start
})

// it.skip('doFind', async () => {
//   const coll = { name: 'items', idField: 'id' }
//
//   const docs = {}
//   _.each(_.range(10000), i => {
//     const id = `as-${i}`
//     const doc = {
//       id,
//       parentId: `parent-${i}`,
//       deleted: 0,
//     }
//     docs[id] = doc
//   })
//
//   const simpleCount = 15
//   const parentIds = _.map(_.range(100, 100 + simpleCount * 10, 10), i => `parent-${i}`)
//   const t1 = time(() => findDirectly(coll, docs, { parentId: { $in: parentIds }, deleted: 0 }, { groupBy: 'activityId' }))
//   console.log(`avg time = ${t1}ms`)
// })
