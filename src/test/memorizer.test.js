import { buildIndex } from '../extra/memorizer'

test('buildIndex', async () => {
  const docs = [
    { a: 'a1', b: 'b1', c: 'c1' },
    { a: 'a1', b: 'b1', c: 'c2' },
    { a: 'a1', b: 'b2', c: 'c1' },

    { a: 'a2', b: 'b1', c: 'c1' },
    { a: 'a2', b: 'b1', c: 'c2' },
    { a: 'a2', b: 'b2', c: 'c1' },
  ]
  expect(buildIndex(docs, ['a', 'b', 'c'])).toEqual({
    a1: {
      b1: {
        c1: [{ a: 'a1', b: 'b1', c: 'c1' }],
        c2: [{ a: 'a1', b: 'b1', c: 'c2' }],
      },
      b2: {
        c1: [{ a: 'a1', b: 'b2', c: 'c1' }],
      },
    },
    a2: {
      b1: {
        c1: [{ a: 'a2', b: 'b1', c: 'c1' }],
        c2: [{ a: 'a2', b: 'b1', c: 'c2' }],
      },
      b2: {
        c1: [{ a: 'a2', b: 'b2', c: 'c1' }],
      },
    },
  })

  expect(buildIndex(docs, ['a', 'b', 'c'], true)).toEqual({
    a1: {
      b1: {
        c1: { a: 'a1', b: 'b1', c: 'c1' },
        c2: { a: 'a1', b: 'b1', c: 'c2' },
      },
      b2: {
        c1: { a: 'a1', b: 'b2', c: 'c1' },
      },
    },
    a2: {
      b1: {
        c1: { a: 'a2', b: 'b1', c: 'c1' },
        c2: { a: 'a2', b: 'b1', c: 'c2' },
      },
      b2: {
        c1: { a: 'a2', b: 'b2', c: 'c1' },
      },
    },
  })
})
