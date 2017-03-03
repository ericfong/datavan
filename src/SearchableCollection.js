import _ from 'lodash'
import {defaultMemoize as memoize} from 'reselect'
import Fuse from 'fuse.js'

import Collection from './Collection'
import createMemoize from './memoizeUtil'


export default class SearchableCollection extends Collection {

  // function being memoize should not use any this and should be defined one
  _getSearchEngine = memoize(function(stateArray, searchEngineConfig) {
    return new Fuse(stateArray, searchEngineConfig)
  })
  getSearchEngine() {
    return this._getSearchEngine(this.getStateArray(), this.searchEngineConfig)
  }

  _search = createMemoize(
    // runner
    (searchEngine, searchEngineConfig, keyword, option) => {
      let arr = searchEngine.search(keyword)
      // normalize matches to find results
      // NOTE cannot use === to compare search results with find results, they are different object
      if (searchEngineConfig && _.includes(searchEngineConfig.include, 'matches')) {
        arr = _.map(arr, result => {
          return {
            ...result.item,
            _matches: result.matches,
          }
        })
      }
      return option && option.limit ? _.slice(arr, 0, option.limit) : arr
    },
    // get states
    () => [this.getSearchEngine(), this.searchEngineConfig],
    // get memory key
    (keyword, option) => [keyword, _.pick(option, 'limit')],
  )
  search(keyword, option) {
    return this._search(keyword, option)
  }
}
