/* eslint import/no-extraneous-dependencies:0 */
const _ = require('lodash')
const shell = require('shelljs')

const ignoredFiles = ['package.json', 'yarn.lock']

function gitGrepAny(name) {
  const stdout = shell.exec(`git grep ${name}`, { silent: true }).stdout
  const lines = stdout.split('\n')
  let pairs = lines.map(line => {
    const i = line.indexOf(':')
    return { file: line.substr(0, i), content: line.substr(i + 1) }
  })
  pairs = _.filter(pairs, pair => pair.file && ignoredFiles.indexOf(pair.file) < 0)
  return pairs
}

function getPackageJson() {
  // eslint-disable-next-line
  return require(`${process.cwd()}/package.json`)
}

const SKIPPED_PACKAGES = [/^babel-*/, /^eslint-*/]

function main() {
  const packageJson = getPackageJson()

  const packageJsonOtherStr = JSON.stringify(_.omit(packageJson, 'dependencies', 'devDependencies'), null, '  ')
  function isNotUsedInPackageJsonScript(name) {
    return packageJsonOtherStr.indexOf(name) < 0
  }

  let testPackages = Object.keys(packageJson.dependencies)

  // options
  // packageJson.devDependencies
  // const skippedPackages = _.slice(process.argv, 2)

  testPackages = _.filter(testPackages, name => isNotUsedInPackageJsonScript(name) && _.every(SKIPPED_PACKAGES, regexp => !name.match(regexp)))

  const nouses = _.filter(testPackages, name => {
    const greped = gitGrepAny(name)
    // console.log(`\n\n${name}:`)
    // _.each(greped, pair => console.log(`\t\t${pair.file}:${pair.content}`))
    return greped.length <= 0
  })

  // eslint-disable-next-line
  console.log(nouses.join('\n'))
}

if (require.main === module) main()
