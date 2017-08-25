import _ from 'lodash'

// NOTE plugin usage `plugin(context)`
// - plugin will modify context
// - plugin return will be ignored

function applyPlugin(plugin, context) {
  Object.assign(context, typeof plugin === 'function' ? plugin(context) : plugin)
}

export default function applyPlugins(plugins, context) {
  if (Array.isArray(plugins)) {
    _.each(_.compact(_.flattenDeep(plugins)), plugin => applyPlugin(plugin, context))
  } else {
    applyPlugin(plugins, context)
  }
}
