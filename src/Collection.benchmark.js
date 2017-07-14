import _ from 'lodash'
import sift from 'sift'
// import { findDirectly } from './Collection'

function time(func) {
  const start = Date.now()
  func()
  func()
  func()
  return (Date.now() - start) / 3
}

const docs = {}
_.each(_.range(10000), i => {
  const id = `as-${i}`
  const doc = {
    id,
    parentId: `parent-${i}`,
    deleted: 0,
  }
  docs[id] = doc
})
const simpleCount = 15
const parentIds = _.map(_.range(100, 100 + simpleCount * 10, 10), i => `parent-${i}`)

it('sift', async () => {
  const sifter = sift({ parentId: { $in: parentIds }, deleted: 0 })
  const t1 = time(() => _.filter(docs, sifter))
  console.log(`sift avg time = ${t1}ms`)
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
