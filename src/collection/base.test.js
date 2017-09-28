import _ from 'lodash'
import { insert } from '..'
import { createCollection } from '.'

test.skip('onMutate', async () => {
  const collection = createCollection({
    onMutate: jest.fn(),
  })

  insert(collection, [{ name: 'A' }, { name: 'B' }])
  const lastCallArgs = collection.onMutate.mock.calls[0]
  expect(_.map(lastCallArgs[0], 'name')).toEqual(['A', 'B'])
  expect(lastCallArgs[1]).toEqual({})
})
