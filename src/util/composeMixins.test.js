import composeMixins from './composeMixins'

test('basic', () => {
  const a = (obj, next) => Object.assign(next({ defaultName: 'a', ...obj, forceDefault: 'a' }), { override: 'A' })
  const b = (obj, next) => Object.assign(next({ defaultName: 'b', ...obj, forceDefault: 'b' }), { override: 'B' })
  const base = obj => Object.assign(obj, { func() {} })

  expect(typeof composeMixins(a, b)).toBe('function')
  expect(typeof composeMixins(a, b, base)({}).func).toBe('function')
  expect(composeMixins(a, b, base)({})).toMatchObject({
    defaultName: 'a',
    forceDefault: 'b',
    override: 'A',
  })
})
