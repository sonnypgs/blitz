/* eslint-disable import/first */

const nextUtilsMock = {
  nextStartDev: jest.fn().mockReturnValue(Promise.resolve()),
}
// Quieten reporter
jest.doMock('../src/reporter', () => ({
  reporter: {copy: jest.fn(), remove: jest.fn()},
}))

// Assume next works
jest.doMock('../src/next-utils', () => nextUtilsMock)
const originalLog = console.log

// Import with mocks applied
import {dev} from '../src/dev'
import {resolve} from 'path'
import {remove, pathExists} from 'fs-extra'
import directoryTree from 'directory-tree'
import * as pkgDir from 'pkg-dir'

describe('Dev command', () => {
  let rootFolder: string
  let buildFolder: string
  let devFolder: string
  let consoleOutput: string[] = []
  const mockedLog = (output: string) => consoleOutput.push(output)

  beforeEach(() => {
    console.log = mockedLog
    jest.clearAllMocks()
  })

  afterEach(async () => {
    console.log = originalLog
    if (await pathExists(devFolder)) {
      await remove(devFolder)
    }
  })

  describe('when with next.config', () => {
    beforeEach(async () => {
      rootFolder = resolve(__dirname, './fixtures/bad-config')
      buildFolder = resolve(rootFolder, '.blitz')
      devFolder = resolve(rootFolder, '.blitz')
    })

    it('should fail when passed a next.config.js', async () => {
      await dev({rootFolder, buildFolder, devFolder, writeManifestFile: false, watch: false})
      consoleOutput.includes(
        'Blitz does not support next.config.js. Please rename your next.config.js to blitz.config.js',
      )
    })
  })

  describe('when run normally', () => {
    beforeEach(async () => {
      rootFolder = resolve(__dirname, './fixtures/dev')
      buildFolder = resolve(rootFolder, '.blitz')
      devFolder = resolve(rootFolder, '.blitz-dev')
      await dev({rootFolder, buildFolder, devFolder, writeManifestFile: false, watch: false})
    })

    it('should copy the correct files to the dev folder', async () => {
      const tree = directoryTree(rootFolder)
      expect(tree).toEqual({
        children: [
          {
            children: [
              {
                extension: '.js',
                name: 'blitz.config.js',
                path: `${devFolder}/blitz.config.js`,
                size: 20,
                type: 'file',
              },
              {
                extension: '.js',
                name: 'next.config.js',
                path: `${devFolder}/next.config.js`,
                size: 138,
                type: 'file',
              },
              {
                extension: '',
                name: 'one',
                path: `${devFolder}/one`,
                size: 0,
                type: 'file',
              },
              {
                extension: '',
                name: 'two',
                path: `${devFolder}/two`,
                size: 0,
                type: 'file',
              },
            ],
            name: '.blitz-dev',
            path: `${devFolder}`,
            size: 158,
            type: 'directory',
          },
          {
            extension: '',
            name: '.now',
            path: `${rootFolder}/.now`,
            size: 18,
            type: 'file',
          },
          {
            extension: '',
            name: 'one',
            path: `${rootFolder}/one`,
            size: 0,
            type: 'file',
          },
          {
            extension: '',
            name: 'two',
            path: `${rootFolder}/two`,
            size: 0,
            type: 'file',
          },
        ],
        name: 'dev',
        path: `${rootFolder}`,
        size: 176,
        type: 'directory',
      })
    })

    it('calls spawn with the patched next cli bin', () => {
      expect(nextUtilsMock.nextStartDev.mock.calls[0][0]).toBe(`${pkgDir.sync(__dirname)}/bin/next-patched`)
      expect(nextUtilsMock.nextStartDev.mock.calls[0][1]).toBe(`${rootFolder}/.blitz-dev`)
    })
  })
})
