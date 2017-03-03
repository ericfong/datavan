import should from 'should'
import {Collection} from '.'
import {composeClass, isClass} from './classUtil'
import fetcher from './fetcher'
import submitter from './submitter'

describe('classUtil', function() {
  it('composeClass', async () => {
    const Class = composeClass(
      {
        idField: 'id',
      },
      fetcher(),
      null && submitter(),
      Collection,
    )
    should( isClass(Class) ).true()
  })
})
