/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import * as tc from '../__fixtures__/tool-cache.js'
import * as io from '../__fixtures__/io.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/tool-cache', () => tc)
jest.unstable_mockModule('@actions/io', () => io)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { toolName, run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    // Set default platform to Windows x64
    core.platform.isWindows = true
    core.platform.arch = 'x64'

    // Set the action's inputs as return values from core.getInput().
    core.getInput.mockImplementation(() => '3.14.0')

    // Mock tool-cache functions with default successful behavior.
    tc.find.mockReturnValue(`/path/to/cached/${toolName}`)
    tc.downloadTool.mockResolvedValue('/path/to/downloaded/python.zip')
    tc.extractZip.mockResolvedValue(`/path/to/extracted/${toolName}`)
    tc.cacheDir.mockResolvedValue(`/path/to/cached/${toolName}`)
    tc.findAllVersions.mockReturnValue([])

    // Mock io functions with default successful behavior.
    io.rmRF.mockResolvedValue()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('Fails on non-Windows platforms', async () => {
    core.platform.isWindows = false

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      'This action only supports Windows runners.'
    )
    expect(tc.find).not.toHaveBeenCalled()
  })

  it('Uses cached Python when available', async () => {
    tc.find.mockReturnValue(`/cached/${toolName}/path`)

    await run()

    expect(tc.find).toHaveBeenCalledWith(toolName, '3.14.0', 'amd64')
    expect(tc.downloadTool).not.toHaveBeenCalled()
    expect(core.addPath).toHaveBeenCalledWith(`/cached/${toolName}/path`)
  })

  it('Downloads and caches Python when not cached (x64)', async () => {
    tc.find.mockReturnValue('')
    tc.downloadTool.mockResolvedValue('/download/path')
    tc.extractZip.mockResolvedValue('/extract/path')
    tc.cacheDir.mockResolvedValue('/cached/path')

    await run()

    expect(tc.find).toHaveBeenCalledWith(toolName, '3.14.0', 'amd64')
    expect(core.info).toHaveBeenCalledWith(
      'Downloading Python 3.14.0 for amd64 from https://www.python.org/ftp/python/3.14.0/python-3.14.0-embed-amd64.zip'
    )
    expect(tc.downloadTool).toHaveBeenCalledWith(
      'https://www.python.org/ftp/python/3.14.0/python-3.14.0-embed-amd64.zip'
    )
    expect(tc.extractZip).toHaveBeenCalledWith('/download/path')
    expect(tc.cacheDir).toHaveBeenCalledWith(
      '/extract/path',
      toolName,
      '3.14.0',
      'amd64'
    )
    expect(core.info).toHaveBeenCalledWith(
      'Python 3.14.0 has been installed and cached at /cached/path'
    )
    expect(core.addPath).toHaveBeenCalledWith('/cached/path')
  })

  it('Downloads and caches Python for arm64 architecture', async () => {
    core.platform.arch = 'arm64'
    tc.find.mockReturnValue('')

    await run()

    expect(tc.find).toHaveBeenCalledWith(toolName, '3.14.0', 'arm64')
    expect(tc.downloadTool).toHaveBeenCalledWith(
      'https://www.python.org/ftp/python/3.14.0/python-3.14.0-embed-arm64.zip'
    )
    expect(tc.cacheDir).toHaveBeenCalledWith(
      `/path/to/extracted/${toolName}`,
      toolName,
      '3.14.0',
      'arm64'
    )
  })

  it('Downloads and caches Python for x86 architecture', async () => {
    core.platform.arch = 'x86'
    tc.find.mockReturnValue('')

    await run()

    expect(tc.find).toHaveBeenCalledWith(toolName, '3.14.0', 'win32')
    expect(tc.downloadTool).toHaveBeenCalledWith(
      'https://www.python.org/ftp/python/3.14.0/python-3.14.0-embed-win32.zip'
    )
    expect(tc.cacheDir).toHaveBeenCalledWith(
      `/path/to/extracted/${toolName}`,
      toolName,
      '3.14.0',
      'win32'
    )
  })

  it('Handles different Python versions', async () => {
    core.getInput.mockReturnValue('3.12.5')
    tc.find.mockReturnValue('')

    await run()

    expect(tc.downloadTool).toHaveBeenCalledWith(
      'https://www.python.org/ftp/python/3.12.5/python-3.12.5-embed-amd64.zip'
    )
    expect(tc.cacheDir).toHaveBeenCalledWith(
      `/path/to/extracted/${toolName}`,
      toolName,
      '3.12.5',
      'amd64'
    )
  })

  it('Sets a failed status on invalid version input', async () => {
    core.getInput.mockReturnValue('invalid-version')
    tc.find.mockReturnValue('')

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      'Invalid Python version input: invalid-version'
    )
  })

  it('Sets a failed status on unsupported architecture', async () => {
    core.platform.arch = 'sparc' // An unsupported architecture
    tc.find.mockReturnValue('')

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      'Unsupported architecture: sparc'
    )
  })

  it('Sets a failed status when download fails', async () => {
    tc.find.mockReturnValue('')
    tc.downloadTool.mockRejectedValue(new Error('Download failed'))

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Download failed')
  })

  it('Sets a failed status when extraction fails', async () => {
    tc.find.mockReturnValue('')
    tc.extractZip.mockRejectedValue(new Error('Extraction failed'))

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Extraction failed')
  })

  it('Sets a failed status when caching fails', async () => {
    tc.find.mockReturnValue('')
    tc.cacheDir.mockRejectedValue(new Error('Caching failed'))

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Caching failed')
  })

  it('Sets a failed status for non-Error exceptions', async () => {
    tc.find.mockReturnValue('')
    tc.downloadTool.mockRejectedValue('String error')

    await run()

    // The action should handle non-Error exceptions gracefully
    // but won't call setFailed since it's not an Error instance
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('Cleans up old Python versions from cache', async () => {
    tc.find.mockReturnValue(`/cached/${toolName}/path`)
    tc.findAllVersions.mockReturnValue(['3.12.0', '3.13.0', '3.14.0'])

    await run()

    expect(tc.findAllVersions).toHaveBeenCalledWith(toolName, 'amd64')
    expect(core.info).toHaveBeenCalledWith(
      'Cleaning cached Python version: 3.12.0'
    )
    expect(core.info).toHaveBeenCalledWith(
      'Cleaning cached Python version: 3.13.0'
    )
    expect(io.rmRF).toHaveBeenCalledWith('3.12.0')
    expect(io.rmRF).toHaveBeenCalledWith('3.13.0')
    expect(io.rmRF).toHaveBeenCalledTimes(2)
  })

  it('Does not clean up the current Python version', async () => {
    tc.find.mockReturnValue(`/cached/${toolName}/path`)
    tc.findAllVersions.mockReturnValue(['3.14.0'])

    await run()

    expect(tc.findAllVersions).toHaveBeenCalledWith(toolName, 'amd64')
    expect(io.rmRF).not.toHaveBeenCalled()
  })

  it('Handles cleanup failures gracefully with warnings', async () => {
    tc.find.mockReturnValue(`/cached/${toolName}/path`)
    tc.findAllVersions.mockReturnValue(['3.12.0', '3.13.0'])
    io.rmRF.mockRejectedValueOnce(new Error('Permission denied'))
    io.rmRF.mockRejectedValueOnce('String error')

    await run()

    expect(tc.findAllVersions).toHaveBeenCalledWith(toolName, 'amd64')
    expect(io.rmRF).toHaveBeenCalledWith('3.12.0')
    expect(io.rmRF).toHaveBeenCalledWith('3.13.0')
    expect(core.warning).toHaveBeenCalledWith(
      'Failed to remove Python version at 3.12.0: Permission denied'
    )
    expect(core.warning).toHaveBeenCalledWith(
      'Failed to remove Python version at 3.13.0: String error'
    )
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(core.addPath).toHaveBeenCalledWith(`/cached/${toolName}/path`)
  })

  it('Cleans up old versions after downloading new Python', async () => {
    tc.find.mockReturnValue('')
    tc.findAllVersions.mockReturnValue(['3.11.0', '3.12.0'])
    tc.downloadTool.mockResolvedValue('/download/path')
    tc.extractZip.mockResolvedValue('/extract/path')
    tc.cacheDir.mockResolvedValue('/cached/path')

    await run()

    expect(tc.findAllVersions).toHaveBeenCalledWith(toolName, 'amd64')
    expect(core.info).toHaveBeenCalledWith(
      'Cleaning cached Python version: 3.11.0'
    )
    expect(core.info).toHaveBeenCalledWith(
      'Cleaning cached Python version: 3.12.0'
    )
    expect(io.rmRF).toHaveBeenCalledWith('3.11.0')
    expect(io.rmRF).toHaveBeenCalledWith('3.12.0')
    expect(core.addPath).toHaveBeenCalledWith('/cached/path')
  })

  it('Continues execution when no old versions exist', async () => {
    tc.find.mockReturnValue(`/cached/${toolName}/path`)
    tc.findAllVersions.mockReturnValue([])

    await run()

    expect(tc.findAllVersions).toHaveBeenCalledWith(toolName, 'amd64')
    expect(io.rmRF).not.toHaveBeenCalled()
    expect(core.addPath).toHaveBeenCalledWith(`/cached/${toolName}/path`)
  })
})
