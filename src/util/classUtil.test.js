import { composeClass, isClass, LocalStorage, SubmittingCollection, FetchingCollection, Collection, KeyValueStore } from '..'

function digProto(Class, num = 1) {
  if (num > 0) return digProto(Object.getPrototypeOf(Class), num - 1)
  return Class
}

test('composeClass', async () => {
  const Class = composeClass(
    {
      idField: 'id',
    },
    LocalStorage,
    SubmittingCollection
  )
  expect(isClass(Class)).toBe(true)
  expect(digProto(Class)).toBe(LocalStorage)
  expect(digProto(Class, 2)).toBe(SubmittingCollection)
  expect(digProto(Class, 3)).toBe(FetchingCollection)
  expect(digProto(Class, 4)).toBe(Collection)
  expect(digProto(Class, 5)).toBe(KeyValueStore)
  expect(digProto(Class, 7)).toEqual({})
  expect(digProto(Class, 8)).toBe(null)
})
