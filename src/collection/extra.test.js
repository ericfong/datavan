import { run } from '..'
import createCollection from '../test/createCollection'

test('run', async () => {
  const myFunc = jest.fn()
  const collection = createCollection({ myFunc })
  run(collection, 'myFunc', 1, 2)
  expect(myFunc).lastCalledWith(collection, 1, 2)
})
