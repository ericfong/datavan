import Collection, { define } from '.'

test('normalizeQuery', async () => {
  const Users = Collection({})
  expect(Users.find()).toEqual([])
  expect(Users.find({})).toEqual([])
})

test('applyOverride', async () => {
  let privateGetAll1
  let privateGetAll2
  const Definition = define({}, self => {
    privateGetAll1 = jest.fn(() => ({ o: '1' }))
    Object.assign(self, {
      onGetAll: privateGetAll1,
    })
  })
  const users = Collection(
    {},
    self => {
      privateGetAll2 = jest.fn(self.onGetAll.bind(self))
      Object.assign(self, {
        onGetAll: privateGetAll2,
      })
    },
    Definition
  )
  expect(typeof users.onGetAll).toBe('function')
  expect(users.get('o')).toBe('1')
  expect(privateGetAll1).toHaveBeenCalledTimes(1)
  expect(privateGetAll2).toHaveBeenCalledTimes(1)
})
