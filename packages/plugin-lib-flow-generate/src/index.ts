import plugin from '@start/plugin/src/'

export default (outDirRelative: string, ...flowArgs: string[]) =>
  plugin('flowGenerate', async ({ files, logFile }) => {
    const path = await import('path')
    const { default: execa } = await import('execa')

    const outDir = path.resolve(outDirRelative)
    const flowBinPath = path.resolve('node_modules/.bin/flow')

    const spawnOptions = {
      stripEof: false,
      env: {
        FORCE_COLOR: '1'
      }
    }

    return {
      files: await Promise.all(
        files.map(async (file) => {
          try {
            await execa(
              'node',
              [flowBinPath, 'gen-flow-files', file.path, '--out-dir', outDir, ...flowArgs],
              spawnOptions
            )
          } catch (e) {
            throw null
          }

          const flowFilePath = path.join(outDir, `${path.basename(file.path)}.flow`)

          logFile(flowFilePath)

          return {
            path: flowFilePath,
            data: null,
            map: null
          }
        })
      )
    }
  })
