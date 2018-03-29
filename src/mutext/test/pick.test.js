import _ from 'lodash'

import { createDb } from '..'

test('query = null or undefined', async () => {
  const db = createDb({
    users: {
      initState: {
        1: {
          key: 'x-key',
          value: 'x-val',
        },
        2: {
          key: 'y-key',
          value: 'y-val',
        },
        3: null,
        4: undefined,
      },
    },
  })
  expect(db.users.getById()).toEqual({ 1: { key: 'x-key', value: 'x-val' }, 2: { key: 'y-key', value: 'y-val' }, 3: null })
  expect(db.users.pick() |> _.values).toHaveLength(3)
  expect(db.users.pick(null) |> _.values).toHaveLength(3)
  // query={} will skip all falsy doc, BUT query=null
  expect(db.users.pick({}) |> _.values).toHaveLength(2)
  expect(db.users.pick('') |> _.values).toHaveLength(0)
  expect(db.users.pick([]) |> _.values).toHaveLength(0)
})
