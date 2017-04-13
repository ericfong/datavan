import _ from 'lodash'
import should from 'should'
import Fuse from 'fuse.js'

import SearchableCollection from './SearchableCollection'

test('BUG for fuse.js in matchAllTokens', async () => {
  var books = [{
    'title': 'Old Man\'s War',
    'author': 'John Scalzi',
  }, {
    'title': 'The Lock Artist',
    'author': 'Steve Hamilton',
  }]
  const fuse = new Fuse(books, {
    shouldSort: true,
    tokenize: true,
    matchAllTokens: true,
    threshold: 0,
    keys: ['title', 'author'],
  })
  expect( fuse.search('old john').length ).toBe(0)
})

describe('SearchableCollection', function() {
  it('basic', async () => {
    var books = [{
      'ISBN': 'A',
      'title': 'Old Man\'s War',
      'author': 'John Scalzi',
    }, {
      'ISBN': 'B',
      'title': 'The Lock Artist',
      'author': 'Steve Hamilton',
    }]
    const state = {
      books: _.keyBy(books, 'ISBN'),
    }
    const _store = {
      getState() {
        return state
      },
    }

    const col = new SearchableCollection()
    _.assign(col, {
      name: 'books',
      searchEngineConfig: {
        shouldSort: true,
        tokenize: true,
        threshold: 0,
        keys: ['title', 'author'],
      },
      _store,
    })

    should( col.search('old')[0] === books[0] ).true()
  })
})
