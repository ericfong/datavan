module.exports = ({ env }) => {
  const envStr = env && env()
  return {
    presets: [
      [
        '@babel/preset-env',
        {
          es6: {
            targets: { browsers: '> 1%' },
            modules: false,
          },
          cjs: {
            targets: { uglify: true },
          },
          test: { targets: { node: 'current' } },
        }[envStr],
      ],
      envStr === 'test' && '@babel/preset-react',
    ].filter(Boolean),

    plugins: [
      '@babel/plugin-proposal-object-rest-spread',
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-export-default-from',

      'lodash',
      // '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
      '@babel/plugin-proposal-pipeline-operator',
    ],
  }
}
