import _ from 'lodash'
import searchTextTokenizer from 'search-text-tokenizer'


export default Base => {
  return class Searchable extends Base {
    _findImplementation(state, query, option) {
      if ('$search' in query) {
        // allow directly pass in parsed keywords (Array of objects with term, exclude, tag fields)
        const keywords = Array.isArray(query.$search) ? query.$search : this._searchParseKeyword(query.$search)
        if (keywords.length === 0) {
          return this._postFind(_.values(state), option)
        }

        const result = _.filter(state, doc =>
          _.every(keywords, keyword => {
            const {tag, exclude, term} = keyword
            let isHit
            if (tag) {
              isHit = this._isSearchHit(term, doc[tag])
            } else {
              isHit = _.some(doc, (v, k) => this._isSearchField(k) && this._isSearchHit(term, v))
            }
            return exclude ? !isHit : isHit
          })
        )
        return this._postFind(result, option)
      }
    }

    _searchParseKeyword(search = '') {
      return _.uniq(searchTextTokenizer(search.toLowerCase()))
    }

    _isSearchField() {
      return true
    }

    _isSearchHit(term, value) {
      const type = typeof value
      if (type === 'string') {
        if (value.toLowerCase().indexOf(term) >= 0) return true
      } else if (type === 'number' && !isNaN(term)) {
        const keywordDotIndex = term.indexOf('.')
        if (keywordDotIndex < 0) {
          // match as integer
          if (Math.trunc(value) === parseInt(term)) return true
        } else {
          // float, full match
          if (value + '' === term) return true
        }
      }
    }
  }
}
