/* eslint-disable no-bitwise */

import bitsObserver from './bitsObserver'

test('basic', () => {
  const { bitmaskTable } = bitsObserver({ A: {}, b: {}, c: {} })
  expect(bitmaskTable).toEqual({ A: 0b01, b: 0b10, c: 0b100 })
})
