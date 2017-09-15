import _ from 'lodash'
import { Component } from 'react'
import setDisplayName from 'recompose/setDisplayName'
import wrapDisplayName from 'recompose/wrapDisplayName'
import createEagerFactory from 'recompose/createEagerFactory'
import { defaultMemoize } from 'reselect'

function _genOnChange(self, pathStr, pathArr, getError, preChange) {
  return (event, value) => {
    // Having that functional form of setState can be called async
    // we need to persist SyntheticEvent
    if (event && typeof event.persist === 'function') {
      event.persist()
    }

    // prepare nextFormValues
    const nextFormValues = { ...self._getValues() }

    // prepare state and call preChange
    const data = {
      value,
      errorText: getError ? getError(value) : undefined,
      pathStr,
      pathArr,
      nextFormValues,
    }
    if (preChange) preChange(event, data)

    // set value (expect data.value may be changed)
    _.set(nextFormValues, pathArr, data.value)

    const { errors } = self.state
    self.setState({
      values: nextFormValues,
      errors: {
        ...errors,
        [pathStr]: data.errorText,
      },
    })
  }
}

const checkAllErrors = (onGetErrors, values) => _.mapValues(onGetErrors, (getError, pathStr) => getError(_.get(values, pathStr, '')))

const initState = {
  values: undefined,
  errors: {},
  isStrict: false,
}

const withBindForm = (formOriginal = 'formOriginal') => BaseComponent => {
  const factory = createEagerFactory(BaseComponent)

  class WithStateHandlers extends Component {
    state = { ...initState }

    onChanges = {}
    onGetErrors = {}
    memorizes = {}

    form = {
      setValues: values => {
        const newState = { values }
        if (values) {
          newState.errors = checkAllErrors(this.onGetErrors, values)
        } else {
          // reset to init state
          _.assign(values, initState)
        }
        this.setState(newState)
      },

      checkError: () => {
        const errors = checkAllErrors(this.onGetErrors, this._getValues())
        this.setState({ isStrict: true, errors })
        return _.first(_.compact(_.values(errors)))
      },

      onChanges: this.onChanges,
      onGetErrors: this.onGetErrors,
      memorizes: this.memorizes,

      // getError: () => _.first(_.compact(_.values(this.state.errors))),
      // setStrict: (isStrict = true) => {
      //   this.setState({ isStrict })
      // },
    }

    _getValues = () => {
      return this.state.values || this.props[formOriginal]
    }

    bindForm = (pathStr, { getError, preChange } = {}) => {
      const pathArr = _.toPath(pathStr)

      // get or create onChange function
      let _onChange = this.onChanges[pathStr]
      if (!_onChange) {
        _onChange = _genOnChange(this, pathStr, pathArr, getError, preChange)
        this.onChanges[pathStr] = _onChange
        if (getError) this.onGetErrors[pathStr] = getError
      }

      let memorize = this.memorizes[pathStr]
      if (!memorize) {
        memorize = this.memorizes[pathStr] = defaultMemoize((value, errorText) => ({
          value,
          errorText,
          name: pathStr,
          onChange: _onChange,
        }))
      }

      const { errors, isStrict } = this.state
      const value = _.get(this._getValues(), pathArr, '')
      const errorText = value || isStrict ? _.get(errors, pathStr) : undefined
      return memorize(value, errorText)
    }

    render() {
      return factory({
        ...this.props,
        bindForm: this.bindForm,
        form: this.form,
        formState: this.state,
        formValues: this._getValues(),
      })
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    return setDisplayName(wrapDisplayName(BaseComponent, 'withBindForm'))(WithStateHandlers)
  }
  return WithStateHandlers
}

export default withBindForm
