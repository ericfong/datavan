export const getBitmaskTable = names => {
  const table = {}
  names.forEach((name, i) => {
    table[name] = 2 ** i
  })
  return table
}

const MAX_SIGNED_31_BIT_INT = 1073741823

const parseNames = nameStr => nameStr.split(/\s*,\s*/)

const bitsObserver = namesObj => {
  const names = Object.keys(namesObj).sort()
  const bitmaskTable = getBitmaskTable(names)

  const calcChangedBits = (a, b) => {
    const result = names.reduce((r, name) => {
      // eslint-disable-next-line no-bitwise
      return a[name] !== b[name] ? r | bitmaskTable[name] : r
    }, 0)
    // changed on somethings that not in names
    return result === 0 && a !== b ? MAX_SIGNED_31_BIT_INT : result
  }

  const getObservedBits = observe => {
    if (!observe) return undefined
    // observe should be string to recognition
    return parseNames(observe).reduce((r, name) => {
      // eslint-disable-next-line no-bitwise
      return r | bitmaskTable[name]
    }, 0)
  }

  return { bitmaskTable, calcChangedBits, getObservedBits }
}

export default bitsObserver
