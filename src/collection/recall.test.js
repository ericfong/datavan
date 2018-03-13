import _ from 'lodash'
import { createStore } from 'redux'

import { datavanEnhancer, recall, getAll, find, mutate, buildIndex, getCollection } from '..'

test('virtual-collection', async () => {
  let calcOrdersThisName = null
  const collections = {
    orders: {
      getState() {
        return {
          byId: recall(this.store, 'orderItems', 'calcOrders'),
          fetchAts: {},
          originals: {},
        }
      },
      addMutation: jest.fn(() => {}),
    },
    orderItems: {
      initState: [{ _id: '1', code: 'x', name: 'X-1' }, { _id: '2', code: 'x', name: 'X-2' }, { _id: '3', code: 'y', name: 'Y-1' }],
      calcOrders(byId) {
        calcOrdersThisName = this.name
        const byNumber = _.groupBy(byId, 'code')
        return _.mapValues(byNumber, (items, code) => ({ _id: code, code, items }))
      },
    },
  }
  const store = createStore(s => s, {}, datavanEnhancer({ collections }))
  const spy = jest.spyOn(getCollection(store, 'orderItems'), 'calcOrders')

  // calc
  expect(spy).toHaveBeenCalledTimes(0)
  expect(getAll(store, 'orders')).toEqual({
    x: { _id: 'x', items: [{ _id: '1', name: 'X-1', code: 'x' }, { _id: '2', name: 'X-2', code: 'x' }], code: 'x' },
    y: { _id: 'y', items: [{ _id: '3', name: 'Y-1', code: 'y' }], code: 'y' },
  })
  expect(spy).toHaveBeenCalledTimes(1)
  expect(calcOrdersThisName).toBe('orderItems')

  // find and won't re-calc
  expect(find(store, 'orders', { 'items.name': 'X-1' })).toEqual([
    { _id: 'x', items: [{ _id: '1', name: 'X-1', code: 'x' }, { _id: '2', name: 'X-2', code: 'x' }], code: 'x' },
  ])

  // addMutation blocked
  mutate(store, 'orders', { $merge: { z: 1 } })
  expect(collections.orders.addMutation).toHaveBeenCalledTimes(1)
  expect(getAll(store, 'orders').z).toBe(undefined)
})

test('buildIndex', async () => {
  const docs = [
    { a: 'a1', b: 'b1', c: 'c1' },
    { a: 'a1', b: 'b1', c: 'c2' },
    { a: 'a1', b: 'b2', c: 'c1' },

    { a: 'a2', b: 'b1', c: 'c1' },
    { a: 'a2', b: 'b1', c: 'c2' },
    { a: 'a2', b: 'b2', c: 'c1' },
  ]
  expect(buildIndex(docs, ['a', 'b', 'c'])).toEqual({
    a1: {
      b1: {
        c1: [{ a: 'a1', b: 'b1', c: 'c1' }],
        c2: [{ a: 'a1', b: 'b1', c: 'c2' }],
      },
      b2: {
        c1: [{ a: 'a1', b: 'b2', c: 'c1' }],
      },
    },
    a2: {
      b1: {
        c1: [{ a: 'a2', b: 'b1', c: 'c1' }],
        c2: [{ a: 'a2', b: 'b1', c: 'c2' }],
      },
      b2: {
        c1: [{ a: 'a2', b: 'b2', c: 'c1' }],
      },
    },
  })

  expect(buildIndex(docs, ['a', 'b', 'c'], true)).toEqual({
    a1: {
      b1: {
        c1: { a: 'a1', b: 'b1', c: 'c1' },
        c2: { a: 'a1', b: 'b1', c: 'c2' },
      },
      b2: {
        c1: { a: 'a1', b: 'b2', c: 'c1' },
      },
    },
    a2: {
      b1: {
        c1: { a: 'a2', b: 'b1', c: 'c1' },
        c2: { a: 'a2', b: 'b1', c: 'c2' },
      },
      b2: {
        c1: { a: 'a2', b: 'b2', c: 'c1' },
      },
    },
  })
})
