import { syncOrThen } from './promiseUtil'

describe('promiseUtil', function() {
  it('Native Promise will not sync', async () => {
    let value = null

    Promise.resolve('A').then(val => (value = val))
    expect(value !== 'A').toBe(true)

    new Promise(resolve => resolve('B')).then(val => (value = val))
    expect(value !== 'B').toBe(true)
  })

  it('SyncResultPromise will sync', async () => {
    let middleResult = null

    const finalResult = syncOrThen('A', val => {
      middleResult = val
      return val
    })

    // check that then run in sync
    expect(middleResult).toBe('A')
    // check that then run in sync
    expect(finalResult).toBe('A')
  })
})
