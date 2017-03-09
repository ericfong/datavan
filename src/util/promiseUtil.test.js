import should from 'should'
import {normalizePromise} from './promiseUtil'

describe('normalizePromise', function() {

  it('Native Promise will not sync', async () => {
    let value = null

    Promise.resolve('A')
    .then(val => value = val)
    should(value).not.equal('A')

    new Promise(resolve => resolve('B'))
    .then(val => value = val)
    should(value).not.equal('B')
  })

  it('NormalizedPromise will sync', async () => {
    let value = null

    normalizePromise(() => 'A')
    .then(val => value = val)
    should(value).equal('A')

    const p2 = normalizePromise(() => 'B')
    should(p2.isNormalizedPromise).be.true()
    should(p2.value).equal('B')
  })
})
