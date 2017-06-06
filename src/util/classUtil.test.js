import { composeClass, SubmittingCollection, FetchingCollection, Collection, KeyValueStore } from '..'
import { isClass } from './classUtil'

function digProto(Class, num = 1) {
  if (num > 0) return digProto(Object.getPrototypeOf(Class), num - 1)
  return Class
}

test('composeClass', async () => {
  const Class = composeClass(
    {
      idField: 'id',
    },
    SubmittingCollection
  )
  expect(isClass(Class)).toBe(true)
  expect(digProto(Class, 1)).toBe(SubmittingCollection)
  expect(digProto(Class, 2)).toBe(FetchingCollection)
  expect(digProto(Class, 3)).toBe(Collection)
  expect(digProto(Class, 4)).toBe(KeyValueStore)
  expect(digProto(Class, 6)).toEqual({})
  expect(digProto(Class, 7)).toBe(null)
})
