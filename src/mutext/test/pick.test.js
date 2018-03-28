import _ from 'lodash'

import { testColl } from './test-util'

test('query = null or undefined', async () => {
  const coll = testColl({
    initState: {
      1: {
        key: 'x-key',
        value: 'x-val',
      },
      2: {
        key: 'y-key',
        value: 'y-val',
      },
    },
  })
  expect(coll.pick() |> _.values).toHaveLength(2)
  expect(coll.pick(null) |> _.values).toHaveLength(2)
  expect(coll.pick('') |> _.values).toHaveLength(0)
  expect(coll.pick([]) |> _.values).toHaveLength(0)
})
