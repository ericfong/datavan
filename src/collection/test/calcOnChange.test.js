import _ from 'lodash'
import { createStore } from 'redux'

import { datavanEnhancer, calcOnChange, getAll, find, mutate } from '../..'
import { buildIndex } from '../calcOnChange'

test('virtual-collection', async () => {
  const collections = {
    orders: {
      getState() {
        return {
          byId: calcOnChange(this.store, 'orderItems', 'calcOrders'),
          fetchAts: {},
          originals: {},
        }
      },
      addMutation: jest.fn(() => {}),
    },
    orderItems: {
      initState: [
        { _id: '1', orderNumber: 'x', name: 'X-1' },
        { _id: '2', orderNumber: 'x', name: 'X-2' },
        { _id: '3', orderNumber: 'y', name: 'Y-1' },
      ],

      calcOrders: jest.fn(byId => {
        return _.mapValues(_.groupBy(byId, 'orderNumber'), (items, orderNumber) => ({ _id: orderNumber, orderNumber, items }))
      }),
    },
  }
  const store = createStore(s => s, {}, datavanEnhancer({ collections }))

  // calc
  expect(collections.orderItems.calcOrders).toHaveBeenCalledTimes(0)
  expect(getAll(store, 'orders')).toEqual({
    x: { _id: 'x', items: [{ _id: '1', name: 'X-1', orderNumber: 'x' }, { _id: '2', name: 'X-2', orderNumber: 'x' }], orderNumber: 'x' },
    y: { _id: 'y', items: [{ _id: '3', name: 'Y-1', orderNumber: 'y' }], orderNumber: 'y' },
  })
  expect(collections.orderItems.calcOrders).toHaveBeenCalledTimes(1)

  // find and won't re-calc
  expect(find(store, 'orders', { 'items.name': 'X-1' })).toEqual([
    { _id: 'x', items: [{ _id: '1', name: 'X-1', orderNumber: 'x' }, { _id: '2', name: 'X-2', orderNumber: 'x' }], orderNumber: 'x' },
  ])
  expect(collections.orderItems.calcOrders).toHaveBeenCalledTimes(1)

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
