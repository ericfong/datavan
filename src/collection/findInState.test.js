import findInState from './findInState'

const collection = {
  _pendingState: {
    byId: {
      1: {
        key: 'x-key',
        value: 'x-val',
      },
      2: {
        key: 'y-key',
        value: 'y-val',
      },
    },
  },
}

test('keyByValue', async () => {
  expect(findInState(collection, {}, { keyBy: 'key', keyByValue: 'value' })).toEqual({ 'x-key': 'x-val', 'y-key': 'y-val' })
})

test('distinct', async () => {
  expect(findInState(collection, {}, { distinct: 'value' })).toEqual(['x-val', 'y-val'])
})
