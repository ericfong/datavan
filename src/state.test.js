import _ from 'lodash'
import Collection from './core/create'

it('onMutate', async () => {
  const collection = Collection({
    onMutate: jest.fn(),
  })

  collection.insert([{ name: 'A' }, { name: 'B' }])
  const lastCallArgs = collection.onMutate.mock.calls[0]
  expect(_.map(lastCallArgs[0], 'name')).toEqual(['A', 'B'])
  expect(lastCallArgs[1]).toEqual({})
})
