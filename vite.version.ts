import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

function shortSha() {
  const deployed = process.env.VERCEL_GIT_COMMIT_SHA?.trim()
  if (deployed) return deployed.slice(0, 7)
  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      cwd: new URL('.', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || 'dev'
  } catch {
    return 'dev'
  }
}

export const versionDefine = {
  __APP_VERSION__: JSON.stringify(version),
  __GIT_SHA__: JSON.stringify(shortSha()),
}
