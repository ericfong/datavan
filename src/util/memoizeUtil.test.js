import _ from 'lodash'
import stringfy from 'fast-stable-stringify'

import {stateMemoizeTable} from './memoizeUtil'


describe('memoizeUtil', function() {
  it('no duplicated cache', async () => {
    const stateArr = [1,2,3]
    const c = {
      find: stateMemoizeTable((stateArray, query, option) => {
        let arr = _.isEmpty(query) ? stateArray : [...stateArr]
        if (option && option.sort) {
          arr = [...stateArr]
        }
        return arr
      }, () => {
        return [stateArr]
      }, (query, option) => {
        return [query, _.pick(option, 'sort')]
      }),
    }

    expect( c.find() === stateArr ).toBe(true)
    expect( c.find({}, {}) === stateArr ).toBe(true)
    expect( c.find({}, {hi: 1}) === stateArr ).toBe(true)
    expect( _.uniq(_.values(c.find.memory)) ).toHaveLength(1)
  })


  it('basic', async () => {
    let runTime = 0
    const obj = {
      find: stateMemoizeTable((query, option) => {
        ++runTime
        return ['Super Long List']
      }),

      list: [1,2,3,4,5,6,7,8,9,0],
      find2: stateMemoizeTable((list, query, option) => {
        ++runTime
        return _.filter(list, item => item % query.mod)
      }, () => {
        return [obj.list]
      }, (query, option) => {
        return stringfy([query, _.pick(option, 'sort')])
      }),
    }

    // find
    const query = {mod: 2}
    const option = {sort: {type: 1, name: -1}, ifModifiedAfter: new Date()}
    const lastResult = obj.find(query, option)
    expect( lastResult ).toEqual(['Super Long List'])
    expect( runTime ).toEqual(1)
    expect( obj.find(query, option) ).toEqual(lastResult)
    expect( runTime ).toEqual(1)

    // find2
    const result2 = obj.find2(query, option)
    expect( result2 ).toEqual([ 1, 3, 5, 7, 9 ])
    expect( runTime ).toEqual(2)
    expect( obj.find2(query, option) ).toEqual(result2)
    expect( runTime ).toEqual(2)

    // diff states
    obj.list = _.map(obj.list, x => x + 10)
    const result3 = obj.find2(query, option)
    expect( result3 ).toEqual([ 11, 13, 15, 17, 19 ])
    expect( runTime ).toEqual(3)
    expect( obj.find2(query, option)).toBe(result3)
    expect( runTime ).toEqual(3)

    // memory table
    expect( _.size(obj.find2.memory) ).toEqual(1)
    expect( obj.find2.memory['[{"mod":2},{"sort":{"name":-1,"type":1}}]']).toBe(result3)
  })
})
