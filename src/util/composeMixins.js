import _ from 'lodash'
import { runMixin } from '../Collection'

export default function (..._mixins) {
  const mixins = _.compact(_.flattenDeep(_mixins))
  const lastIndex = mixins.length - 1
  return self => {
    for (let i = lastIndex; i >= 0; i--) {
      runMixin(self, mixins[i])
    }
    return self
  }
}
