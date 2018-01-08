import { createFactory, Component } from 'react'
import { setDisplayName, wrapDisplayName } from 'recompose'
import { connect } from 'react-redux'

const withMethods = spec => BaseComponent => {
  const factory = createFactory(BaseComponent)

  if (process.env.NODE_ENV !== 'production' && spec.render) {
    console.error('withMethods() does not support the render method; its behavior is to pass all props and state to the base component.')
  }

  class _WithMethods extends Component {
    constructor(props, context) {
      super(props, context)
      this.state = {}

      const methods = {}
      Object.keys(spec).forEach(key => {
        if (key !== 'constructor') methods[key] = spec[key].bind(this)
      })
      this.methods = methods

      if (spec.constructor) spec.constructor.call(this, props, context)
    }

    render() {
      return factory({
        ...this.props,
        ...this.methods,
        ...this.state,
      })
    }
  }
  const WithMethods = connect()(_WithMethods)

  if (process.env.NODE_ENV !== 'production') {
    return setDisplayName(wrapDisplayName(BaseComponent, 'withMethods'))(WithMethods)
  }
  return WithMethods
}

export default withMethods
