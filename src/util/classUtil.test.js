import should from 'should'
import { Collection } from '..'
import { composeClass, isClass } from './classUtil'
import FetchingCollection from '../FetchingCollection'

describe('classUtil', function() {
  it('composeClass', async () => {
    const Class = composeClass(
      {
        idField: 'id',
      },
      FetchingCollection,
      null,
      Collection
    )
    should(isClass(Class)).true()
  })
})
