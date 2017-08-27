import _ from 'lodash'
import searchTextTokenizer from 'search-text-tokenizer'
import { processOption } from '../core/finder'

function indexOfTerm(term, value) {
  if (!value) return -1
  const type = typeof value
  if (type === 'string') {
    return value.toLowerCase().indexOf(term)
  } else if (type === 'number' && !isNaN(term)) {
    const termWithDot = term.indexOf('.')
    if (termWithDot < 0) {
      // match as integer
      if (Math.trunc(value) === parseInt(term, 10)) {
        return 0
      }
    } else if (`${value}` === term) {
      // float, full match
      return 0
    }
  }
  return -1
}

function getMatch(term, testObj, fieldArr) {
  for (let i = 0, ii = fieldArr.length; i < ii; i++) {
    const field = fieldArr[i]
    const value = _.get(testObj, field)
    const index = indexOfTerm(term, value)
    if (index >= 0) {
      return { term, field, index, value, percentage: term.length / value.length }
    }
  }
  return null
}

function getMatches(doc, keywords, fieldArr) {
  return _.map(keywords, keyword => {
    const { term, exclude } = keyword
    const fieldIndex = getMatch(term, doc, fieldArr)
    if (exclude) {
      return fieldIndex ? null : { term, exclude: true, field: 'exclude', index: 0, percentage: 0.5 }
    }
    return fieldIndex
  })
}

function matchKeywords(doc, keywords, fieldArr) {
  const matches = getMatches(doc, keywords, fieldArr)

  if (!_.every(matches)) return false

  let sort = 1000
  for (let i = 0, ii = matches.length; i < ii; i++) {
    const match = matches[i]

    if (i > 0) {
      const lastMatch = matches[i - 1]
      // same field and after last index
      if (match.field === lastMatch.field) {
        // same field, follow sequence of keywords
        if (match.index >= lastMatch.index + lastMatch.term.length) {
          sort -= 5 * match.percentage
          break
        }
        // same field, before last index
        if (match.index !== lastMatch.index) {
          sort -= 3 * match.percentage
          break
        }
      }
    }

    // diff field or first field
    sort -= match.percentage
  }

  doc._sort = sort
  return true
}

function tokenizeKeywords(keywordStr) {
  // can use tag which extracted from searchTextTokenizer in future
  // '-car' => [ { term: 'car', exclude: true } ]
  return _.uniq(searchTextTokenizer(keywordStr))
}

export function search(docs, keywordStr, getSearchFields) {
  const wholeSearchStr = keywordStr.trim().toLowerCase()
  if (!wholeSearchStr) return docs
  const keywords = _.map(tokenizeKeywords(wholeSearchStr), keyword => {
    if (keyword.tag) {
      // kind of remove tag feature
      keyword.term = `${keyword.tag}:${keyword.term}`
    }
    return keyword
  })
  if (keywords.length === 0) return docs

  const results = []
  _.each(docs, doc => {
    const fieldArr = getSearchFields(doc)

    const wholeMatch = getMatch(wholeSearchStr, doc, fieldArr)
    if (wholeMatch) {
      doc._sort = 1 - wholeMatch.percentage
      results.push(doc)
      return
    }

    if (matchKeywords(doc, keywords, fieldArr)) {
      // matchKeywords will fill-up _sort
      results.push(doc)
    }
  })

  return _.sortBy(results, '_sort')
}

function defaultFields(doc) {
  return _.keys(doc)
}

export default function plugSearchable({ fields = defaultFields }) {
  return spec =>
    Object.assign({}, spec, {
      onFind(state, query, option) {
        if ('$search' in query) {
          const getSearchFields = Array.isArray(fields) ? () => fields : fields
          let result = search(state, query.$search, getSearchFields)
          if (!Array.isArray(result)) {
            result = _.values(result)
          }
          return processOption(result, option)
        }
      },
    })
}
