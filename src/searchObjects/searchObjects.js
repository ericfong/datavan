import _ from 'lodash'
import searchTextTokenizer from 'search-text-tokenizer'

function indexOfTerm(term, value, valueStr) {
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
    } else if (valueStr === term) {
      // float, full match
      return 0
    }
  }
  return -1
}

function matchTerm(item, term) {
  // eslint-disable-next-line
  for (const field in item) {
    const value = item[field]
    const valueStr = `${value}`
    const index = indexOfTerm(term, value, valueStr)
    // console.log('>> matchTerm >>', index, value, term)
    if (index >= 0) {
      return {
        term,
        field,
        index,
        value,
        percentage: term.length / valueStr.length,
      }
    }
  }
  return null
}

function matchKeywords(item, keywords) {
  const matches = _.map(keywords, keyword => {
    const { term, exclude } = keyword
    const fieldIndex = matchTerm(item, term)
    if (exclude) {
      if (fieldIndex) return null
      return {
        term,
        exclude: true,
        field: 'exclude',
        index: 0,
        percentage: 0.5,
      }
    }
    return fieldIndex
  })
  return _.every(matches) ? matches : null
}

function calcRelevance(matches) {
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
  return sort
}

export function tokenizeKeywords(searchStr) {
  if (!searchStr) return null
  // can use tag which extracted from searchTextTokenizer in future
  // '-car' => [ { term: 'car', exclude: true } ]
  const keywords = searchTextTokenizer(searchStr)
  if (keywords.length === 0) return null

  return _.map(keywords, keyword => {
    if (keyword.tag) {
      // kind of remove tag feature
      keyword.term = `${keyword.tag}:${keyword.term}`
    }
    return keyword
  })
}

const defaultPickFields = doc => doc
const defaultTuneOrder = _order => _order

export default function searchObjects(docs, search, conf) {
  const keywords = Array.isArray(search) ? search : tokenizeKeywords(_.trim(search).toLowerCase())
  if (!keywords || keywords.length === 0) return []

  let hasExclude = false
  const terms = _.map(keywords, keyword => {
    if (keyword.exclude) hasExclude = true
    return keyword.term
  })
  const noExcludeSearchStr = hasExclude ? null : terms.join(' ')

  // normalize options
  const optType = typeof conf
  let pick
  let tuneOrder
  if (optType === 'function' || Array.isArray(conf)) {
    pick = conf
  } else if (optType === 'object') {
    pick = conf.pick
    tuneOrder = conf.tuneOrder
  }
  if (!pick) {
    pick = defaultPickFields
  } else if (Array.isArray(pick)) {
    const fields = pick
    // pick = doc => _.pick(doc, fields)
    pick = doc =>
      _.transform(
        fields,
        (ret, field) => {
          ret[field] = _.get(doc, field)
        },
        {}
      )
  }
  if (!tuneOrder) tuneOrder = defaultTuneOrder

  // filter
  const items = []
  _.each(docs, doc => {
    const item = typeof doc === 'object' ? pick(doc) : { value: doc }

    if (noExcludeSearchStr) {
      const wholeMatch = matchTerm(item, noExcludeSearchStr)
      if (wholeMatch) {
        item._order = tuneOrder(1 - wholeMatch.percentage, doc)
        item._doc = doc
        items.push(item)
        return
      }
    }

    const matches = matchKeywords(item, keywords)
    if (matches) {
      item._order = tuneOrder(calcRelevance(matches), doc)
      item._doc = doc
      items.push(item)
    }
  })

  // _order should be float between 0 to 1 and sort in asc
  // sort
  return _.map(_.sortBy(items, '_order'), '_doc')
}
