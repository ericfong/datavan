import composeMixins from './composeMixins'

test('basic', () => {
  const a = self => Object.assign(self, { name: 'A', a: true })
  const b = self => Object.assign(self, { name: 'B', b: true })
  const base = self => Object.assign(self, { func() {} })

  expect(typeof composeMixins(a, b)).toBe('function')
  expect(typeof composeMixins(a, b, base)({}).func).toBe('function')
  expect(composeMixins(a, b, base)({})).toMatchObject({
    name: 'A',
    a: true,
    b: true,
  })
})
