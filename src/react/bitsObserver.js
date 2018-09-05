export const getBitmaskTable = names => {
  const table = {}
  names.forEach((name, i) => {
    table[name] = 2 ** i
  })
  return table
}

const MAX_SIGNED_31_BIT_INT = 1073741823

const parseNames = nameStr => nameStr.split(/\s*,\s*/)

/* eslint-disable no-bitwise */

const bitsObserver = namesObj => {
  const names = Object.keys(namesObj).sort()
  const bitmaskTable = getBitmaskTable(names)

  const calcChangedBits = (a, b) => {
    const result = names.reduce((r, name) => (a[name] !== b[name] ? r | bitmaskTable[name] : r), 0)
    // changed on somethings that not in names
    return result === 0 && a !== b ? MAX_SIGNED_31_BIT_INT : result
  }

  const getObservedBits = observe => {
    if (!observe) return undefined
    // observe should be string to recognition
    return parseNames(observe).reduce((r, name) => r | bitmaskTable[name], 0)
  }

  return { bitmaskTable, calcChangedBits, getObservedBits }
}

export default bitsObserver
