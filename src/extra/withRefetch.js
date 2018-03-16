import stringify from 'fast-stable-stringify'
import { createFactory, Component } from 'react'
import { setDisplayName, wrapDisplayName } from 'recompose'

// use to replace inResponse but store base
export const withRefetch = (onFetch, mapProps) => BaseComponent => {
  const factory = createFactory(BaseComponent)

  class WithRefetch extends Component {
    state = {}

    refetch = (...args) => {
      const key = stringify(args)
      const cached = this.state[key]
      if (!cached) {
        onFetch(...args).then(r => this.setState({ [key]: r, refetchAt: Date.now() }))
      }
      return cached
    }

    render() {
      const props = {
        ...this.props,
        refetch: this.refetch,
        refetchAt: this.state.refetchAt,
      }
      return factory(mapProps ? { ...props, ...mapProps(props) } : props)
    }
  }

  if (process.env.NODE_ENV !== 'production') return setDisplayName(wrapDisplayName(BaseComponent, 'withRefetch'))(WithRefetch)
  return WithRefetch
}
