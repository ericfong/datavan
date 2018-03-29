import _ from 'lodash'

import createStore from '../store'

test('virtual-collection', async () => {
  let calcOrdersThisName = null
  const db = createStore({
    orders: {
      getSubmits() {
        return this.getStoreState().orderItems.recall('calcOrders')
      },
      getPreloads() {
        return this.preloads
      },
      mutateData: jest.fn(() => {}),
    },
    orderItems: {
      initState: [{ _id: '1', code: 'x', name: 'X-1' }, { _id: '2', code: 'x', name: 'X-2' }, { _id: '3', code: 'y', name: 'Y-1' }],
      calcOrders(byId) {
        calcOrdersThisName = this.name
        const byNumber = _.groupBy(byId, 'code')
        return _.mapValues(byNumber, (items, code) => ({ _id: code, code, items }))
      },
    },
  })
  const spy = jest.spyOn(db.orderItems, 'calcOrders')

  // calc
  expect(spy).toHaveBeenCalledTimes(0)
  expect(db.orders.getById()).toEqual({
    x: { _id: 'x', items: [{ _id: '1', name: 'X-1', code: 'x' }, { _id: '2', name: 'X-2', code: 'x' }], code: 'x' },
    y: { _id: 'y', items: [{ _id: '3', name: 'Y-1', code: 'y' }], code: 'y' },
  })
  expect(spy).toHaveBeenCalledTimes(1)
  expect(calcOrdersThisName).toBe('orderItems')

  // find and won't re-calc
  expect(db.orders.find({ 'items.name': 'X-1' })).toEqual([
    { _id: 'x', items: [{ _id: '1', name: 'X-1', code: 'x' }, { _id: '2', name: 'X-2', code: 'x' }], code: 'x' },
  ])

  // addMutation blocked
  db.orders.mutate({ $merge: { z: 1 } })
  expect(db.orders.mutateData).toHaveBeenCalledTimes(1)
  expect(db.orders.getById().z).toBe(undefined)
})
