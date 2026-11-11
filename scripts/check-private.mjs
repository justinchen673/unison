// Scans every file that would be committed for personal or private information: email addresses, local machine
// paths, credentials, registry URLs in the lockfile, and links to hosts that haven't been reviewed.
// Usage: npm run check:private            (all tracked and untracked, non-ignored files)
//        node scripts/check-private.mjs a b (only the given files)
// It can't recognize real names or employer details in plain prose, so changes still need a manual read-through.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Public sites the docs and code are allowed to link to. Add a host only after checking it's public and not tied to anyone.
const ALLOWED_HOSTS = new Set(['www.w3.org', 'github.com', 'nodejs.org', 'vite.dev', 'localhost:5173', 'arrangeus.app', 'stancz.com', 'zipdo.co'])

const CHECKS = [
  ['email address', /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g],
  ['local file path', /(?<![A-Za-z])[A-Za-z]:[\\/][^\s'"`)]*|[\\/](Users|home)[\\/][^\s'"`)]+/g],
  ['credential', /gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(api[_-]?key|secret|password|token)\b\s*[:=]\s*['"][^'"\s]{8,}/gi],
]

const self = 'scripts/check-private.mjs'
const files = process.argv.length > 2
  ? process.argv.slice(2)
  : execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\n').filter((f) => f && f !== self)

const findings = []
for (const file of files) {
  const buffer = readFileSync(file)
  if (buffer.includes(0)) continue
  buffer.toString('utf8').split('\n').forEach((line, i) => {
    const report = (kind, text) => findings.push(`${file}:${i + 1}: ${kind}: ${text}`)
    for (const [kind, pattern] of CHECKS) for (const m of line.matchAll(pattern)) report(kind, m[0])
    if (file.endsWith('package-lock.json')) {
      // Its links are npm package metadata (e.g. funding pages); only registry download URLs matter there.
      if (/"resolved":/.test(line)) report('registry URL in lockfile', line.trim())
      return
    }
    for (const m of line.matchAll(/https?:\/\/([^/\s'"`<>)\]]+)/g)) if (!ALLOWED_HOSTS.has(m[1].toLowerCase())) report('unreviewed link host', m[1])
  })
}

if (findings.length) {
  console.error(`Possible personal or private information (${findings.length}):\n${findings.join('\n')}`)
  console.error('\nRemove it, or if it is definitely public and safe, add the host to ALLOWED_HOSTS in scripts/check-private.mjs.')
  process.exit(1)
}
console.log(`check:private passed (${files.length} files). Also read your changes yourself for names or employer details.`)
