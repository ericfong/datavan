import _ from 'lodash'
import should from 'should'

import SearchableCollection from './SearchableCollection'


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

    const col = new SearchableCollection()
    _.assign(col, {
      name: 'books',
      searchEngineConfig: {
        shouldSort: true,
        tokenize: true,
        threshold: 0,
        keys: ['title', 'author'],
      },
      getStoreState: () => state,
    })

    should( col.search('old')[0] === books[0] ).true()
  })
})
