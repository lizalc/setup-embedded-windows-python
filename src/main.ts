import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as io from '@actions/io'
import * as semver from 'semver'
import { platform } from '@actions/core'

export const toolName: string = 'python-embedded'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    if (!platform.isWindows) {
      core.setFailed('This action only supports Windows runners.')
      return
    }

    const version: string = core.getInput('version')
    if (!semver.valid(version)) {
      core.setFailed(`Invalid Python version input: ${version}`)
      return
    }

    const archMap: Record<string, string> = {
      x64: 'amd64',
      arm64: 'arm64',
      x86: 'win32'
    }

    const arch: string | undefined = archMap[platform.arch]
    if (!arch) {
      core.setFailed(`Unsupported architecture: ${platform.arch}`)
      return
    }

    const url: string = `https://www.python.org/ftp/python/${version}/python-${version}-embed-${arch}.zip`
    let toolPath: string = tc.find(toolName, version, arch)

    if (!toolPath) {
      core.info(`Downloading Python ${version} for ${arch} from ${url}`)
      const downloadPath: string = await tc.downloadTool(url)
      const extractPath: string = await tc.extractZip(downloadPath)
      toolPath = await tc.cacheDir(extractPath, toolName, version, arch)
      core.info(
        `Python ${version} has been installed and cached at ${toolPath}`
      )
    }

    for (const ver of tc
      .findAllVersions(toolName, arch)
      .filter((v) => v !== version)) {
      core.info(`Cleaning cached Python version: ${ver}`)
      try {
        await io.rmRF(ver)
      } catch (err) {
        core.warning(
          `Failed to remove Python version at ${ver}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    core.addPath(toolPath)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
