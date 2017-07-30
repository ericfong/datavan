import Collection from '.'

test('normalizeQuery', async () => {
  const Users = Collection({})
  expect(Users.find()).toEqual([])
  expect(Users.find({})).toEqual([])
})
