import should from 'should'
import {Collection} from '..'
import {composeClass, isClass} from './classUtil'
import Fetcher from '../Fetcher'

describe('classUtil', function() {
  it('composeClass', async () => {
    const Class = composeClass(
      {
        idField: 'id',
      },
      Fetcher,
      null,
      Collection,
    )
    should( isClass(Class) ).true()
  })
})
