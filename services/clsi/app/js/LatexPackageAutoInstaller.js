import { execFile } from 'child_process'
import { promisify } from 'node:util'
import Settings from '@overleaf/settings'
import logger from '@overleaf/logger'

const execFileAsync = promisify(execFile)
const DEFAULT_MAX_RETRIES = 3
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000
const HISTORIC_TEXLIVE_REPOSITORY =
  'https://ftp.math.utah.edu/pub/tex/historic/systems/texlive'
const EXEC_OPTIONS = {
  maxBuffer: 10 * 1024 * 1024,
  timeout: INSTALL_TIMEOUT_MS,
}
const MISSING_FILE_REGEX = /LaTeX Error: File [`']([^`'\n]+)['`] not found\./m

let aptUpdatedAt = 0
let tlmgrRepositoryReady = false

function getSettings() {
  const config = Settings.clsi?.autoInstallMissingLatexPackages || {}
  return {
    enabled: config.enabled !== false,
    maxRetries: Number.isInteger(config.maxRetries)
      ? config.maxRetries
      : DEFAULT_MAX_RETRIES,
  }
}

function extractMissingLatexFile(output = {}) {
  const combinedOutput = [output.stdout, output.stderr].filter(Boolean).join('\n')
  const match = combinedOutput.match(MISSING_FILE_REGEX)
  return match?.[1] || null
}

async function installMissingPackageFromOutput(projectId, output) {
  const { enabled } = getSettings()
  if (!enabled) {
    return null
  }

  const missingFile = extractMissingLatexFile(output)
  if (!missingFile) {
    return null
  }

  try {
    if (await _commandExists('tlmgr')) {
      return await _installViaTlmgr(missingFile)
    }

    if (await _commandExists('apt-file') && await _commandExists('apt-get')) {
      return await _installViaApt(projectId, missingFile)
    }
  } catch (err) {
    logger.warn(
      { err, projectId, missingFile },
      'failed while attempting to auto-install missing LaTeX package'
    )
  }

  return null
}

async function _installViaTlmgr(missingFile) {
  await _ensureTlmgrRepository()
  const searchArg = `/${missingFile}`
  const { stdout } = await execFileAsync(
    'tlmgr',
    ['search', '--global', '--file', searchArg],
    EXEC_OPTIONS
  )
  const packages = _parseTlmgrPackages(stdout)

  if (packages.length === 0) {
    return null
  }

  await execFileAsync('tlmgr', ['install', ...packages], EXEC_OPTIONS)
  return {
    installer: 'tlmgr',
    missingFile,
    packages,
  }
}

async function _ensureTlmgrRepository() {
  if (tlmgrRepositoryReady) {
    return
  }

  const { stdout, stderr } = await execFileAsync(
    'tlmgr',
    ['--version'],
    EXEC_OPTIONS
  )
  const versionOutput = `${stdout}\n${stderr}`
  const yearMatch = versionOutput.match(/version (\d{4})/i)

  if (!yearMatch) {
    return
  }

  const repository = `${HISTORIC_TEXLIVE_REPOSITORY}/${yearMatch[1]}/tlnet-final`
  await execFileAsync(
    'tlmgr',
    ['option', 'repository', repository],
    EXEC_OPTIONS
  )
  tlmgrRepositoryReady = true
}

async function _installViaApt(projectId, missingFile) {
  const regexp = `(^|/)${_escapeRegExp(missingFile)}$`
  const { stdout } = await execFileAsync(
    'apt-file',
    ['search', '--regexp', regexp],
    EXEC_OPTIONS
  )
  const packages = _parseAptPackages(stdout)

  if (packages.length === 0) {
    return null
  }

  await _ensureAptLists(projectId)
  await execFileAsync(
    'apt-get',
    ['install', '-y', '--no-install-recommends', ...packages],
    EXEC_OPTIONS
  )

  return {
    installer: 'apt',
    missingFile,
    packages,
  }
}

async function _ensureAptLists(projectId) {
  const now = Date.now()
  if (now - aptUpdatedAt < 60 * 60 * 1000) {
    return
  }

  logger.info({ projectId }, 'running apt-get update for LaTeX auto-install')
  await execFileAsync('apt-get', ['update'], EXEC_OPTIONS)
  aptUpdatedAt = now
}

function _parseTlmgrPackages(stdout) {
  return Array.from(
    new Set(
      stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => /^[^\s:][^:]*:$/.test(line))
        .map(line => line.slice(0, -1))
    )
  )
}

function _parseAptPackages(stdout) {
  return Array.from(
    new Set(
      stdout
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => line.split(':', 1)[0])
        .filter(
          packageName =>
            packageName &&
            !packageName.endsWith('-doc') &&
            !packageName.includes('-documentation')
        )
    )
  )
}

async function _commandExists(command) {
  try {
    await execFileAsync('which', [command], EXEC_OPTIONS)
    return true
  } catch {
    return false
  }
}

function _escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default {
  extractMissingLatexFile,
  installMissingPackageFromOutput,
  getMaxRetries() {
    return getSettings().maxRetries
  },
  promises: {
    installMissingPackageFromOutput,
  },
}
