import Sequence from '@start/plugin-sequence/src/'
import Parallel from '@start/plugin-parallel/src/'
import xargs from '@start/plugin-xargs/src/'
import Reporter from '@start/middleware-reporter/src/'
import assert from '@start/plugin-assert/src/'
import env from '@start/plugin-env/src/'
import find from '@start/plugin-find/src/'
import findGitStaged from '@start/plugin-find-git-staged/src/'
import clean from '@start/plugin-clean/src/'
import read from '@start/plugin-read/src/'
import babel from '@start/plugin-lib-babel/src/'
import rename from '@start/plugin-rename/src/'
import write from '@start/plugin-write/src/'
import overwrite from '@start/plugin-overwrite/src/'
import watch from '@start/plugin-watch/src/'
import eslint from '@start/plugin-lib-eslint/src/'
import prettierEslint from '@start/plugin-lib-prettier-eslint/src/'
import {
  istanbulInstrument,
  istanbulReport,
  istanbulThresholds,
} from '@start/plugin-lib-istanbul/src/'
import tape from '@start/plugin-lib-tape/src/'
import typescriptGenerate from '@start/plugin-lib-typescript-generate/src/'
// import npmVersion from '@start/plugin-lib-npm-version/src/'
import npmPublish from '@start/plugin-lib-npm-publish/src/'
import tapDiff from 'tap-diff'

const reporter = Reporter()
const sequence = Sequence(reporter)
const parallel = Parallel()

const babelConfig = {
  babelrc: false,
  retainLines: true,
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 8,
        },
        exclude: ['transform-regenerator'],
        modules: false,
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: ['@babel/plugin-syntax-dynamic-import'],
}

export const dts = (packageName: string) =>
  sequence(
    assert(packageName, 'package name is required'),
    find(`packages/${packageName}/src/**/*.ts`),
    // FIXME using TypeScript API even if it's horrible
    typescriptGenerate(`packages/${packageName}/build/`, [
      '--lib',
      'esnext',
      '--allowSyntheticDefaultImports',
    ])
  )

export const build = (packageName: string) =>
  sequence(
    assert(packageName, 'package name is required'),
    env('NODE_ENV', 'production'),
    find(`packages/${packageName}/build/`),
    clean,
    find(`packages/${packageName}/src/**/*.ts`),
    read,
    babel(babelConfig),
    prettierEslint(),
    rename((file) => file.replace(/\.ts$/, '.js')),
    write(`packages/${packageName}/build/`)
  )

export const pack = (packageName: string) =>
  sequence(
    assert(packageName, 'package name is required'),
    env('NODE_ENV', 'production'),
    find(`packages/${packageName}/build/`),
    clean,
    parallel(build, dts)(packageName)
  )

export const packs = xargs(pack)

export const dev = (packageName: string) =>
  sequence(
    assert(packageName, 'package name is required'),
    find(`packages/${packageName}/build/`),
    clean,
    watch(`packages/${packageName}/src/**/*.ts`)(
      sequence(read, babel(babelConfig), write(`packages/${packageName}/build/`))
    )
  )

export const lint = () =>
  sequence(findGitStaged(['packages/**/@(src|test)/**/*.ts', 'tasks/**/*.ts']), eslint())

export const lintAll = () =>
  sequence(find(['packages/**/@(src|test)/**/*.ts', 'tasks/**/*.ts']), eslint())

export const fix = () =>
  sequence(
    find(['packages/*/@(src|test)/**/*.ts', 'tasks/**/*.ts']),
    read,
    prettierEslint(),
    overwrite
  )

export const test = () =>
  sequence(
    find('packages/**/src/**/*.ts'),
    istanbulInstrument({ esModules: true }, ['.ts']),
    find('packages/**/test/**/*.ts'),
    tape(tapDiff),
    istanbulReport(['lcovonly', 'html', 'text-summary'])
    // istanbulThresholds({ functions: 30 })
  )

export const ci = () => sequence(lintAll(), test())

export const publish = (packageName: string, /* version: string, */ otp: string) =>
  sequence(
    assert(packageName, 'package name is required'),
    // assert(version, 'package name is required'),
    assert(packageName, 'OTP is required'),
    ci(),
    pack(packageName),
    // npmVersion(version, `packages/${packageName}`),
    npmPublish(`packages/${packageName}`, { otp })
  )