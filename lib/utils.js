const util = require('util')
const nodeExec = util.promisify(require('child_process').exec)

// Configuration stuff
const fs = require('fs')
const path = require('path')
const pathFromRoot = (target) => path.join(__dirname, '..', ...target)
const packagePath = pathFromRoot(['package.json'])

// Logs colors
const FG_GREEN = '\x1b[32m'
const FG_RED = '\x1b[31m'
const FG_YELLOW = '\x1b[33m'

// Git commands
const gitDiffBase = 'git diff --staged --diff-filter=ACM'
// List added or updated file names only
const gitStagedFiles = `${gitDiffBase} --name-only`
// We don't use `git show :0:${file}` because we only want to
// process created or updated raws.
const gitShowStaged = (file) =>
  `${gitDiffBase} --unified=0 ${file} | grep "^+[^+]" | sed -E "s/^\\+\\s*//"`

// Print error with color depending on given severity.
// - error: red
// - warning: yellow
// - standard: green
function colorizedLog(logLevel, text) {
  // Colors code won’t be used if not in TTY
  if (!process.stderr.isTTY && !process.stdout.isTTY) {
    console.log(text)
    return
  }
  const color = logLevel === 'error' ? FG_RED : FG_YELLOW
  console[logLevel](`${color}%s\x1b[0m`, text)
}

// Print
function colorizedLogTitle(logLevel, hookTitle, text) {
  let coloredIcon
  if (logLevel === 'error') {
    coloredIcon = `${FG_RED}✖  ${hookTitle}\x1b[0m`
  } else if (logLevel === 'warning') {
    coloredIcon = `${FG_YELLOW}❗  ${hookTitle}\x1b[0m`
  } else {
    coloredIcon = `${FG_GREEN}✔  ${hookTitle}\x1b[0m`
  }
  console.log(`${coloredIcon}: ${text}`)
}

// Because we need more than default output…
function largeOutputExec(command, options = {}) {
  return nodeExec(command, { maxBuffer: 1024 * 1024, ...options })
}

// Output an error using red color, then exit program
function logAndExitWithTitle(err, hookTitle) {
  colorizedLogTitle('error', hookTitle, `Couldn’t run 'exec' command: ${err}`)
  // EX_DATAERR (65): The input data was incorrect in some way
  process.exit(65)
}

// Wrap large output exec with automatic log on error
function exec(command, hookTitle, options = {}) {
  return largeOutputExec(command).catch((err) =>
    logAndExitWithTitle(err, hookTitle)
  )
}

// Get files names that are staged
async function getStagedFiles(hookTitle) {
  const { stdout } = await exec(gitStagedFiles, hookTitle)
  // Manage files, remove empty lines from `git diff` result
  return stdout.split('\n').filter(Boolean)
}

// Read one staged file content
async function getStagedContent(file, hookTitle) {
  const { stdout } = await exec(gitShowStaged(file), hookTitle)
  return { fileName: file, content: stdout }
}

// Load staged contents for later parsing.
// This won't load `pre-commit` files contents.
function getStagedContents(files) {
  return Promise.all(
    files.filter((file) => !/pre-commit$/.test(file)).map(getStagedContent)
  )
}

// Load configuration as JSON from package.json
function loadPackageJSON() {
  return JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
}

// Loop over errors and print them.
// Each errors group will be prefixed by its message, ie.:
//
// ```
// === You’ve got leftover conflict markers ===
// File1
// File2
// ```
function printErrors(severity, errors, hookTitle) {
  const entries = Object.entries(errors)
  if (entries.length === 0) {
    return false
  }

  const title =
    severity === 'error'
      ? 'oops, something’s wrong!  😱\n'
      : 'there may be something to improve or fix!\n'
  colorizedLogTitle(severity, hookTitle, title)

  for (const [message, fileNames] of entries) {
    const title = `=== ${message} ===`
    const text = [title, ...fileNames].join('\n') + '\n'
    colorizedLog(severity, text)
  }

  return true
}

// Convert regExp from string, spliting options when needed.
//
// Examples:
// "/^[<>|=]{4,}/m" => new Regexp("^[<>|=]{4,}", "m")
// "(?:FIXME|TODO)" => new Regexp("(?:FIXME|TODO)")
function regexFromStr(regex) {
  if (!regex) {
    return
  }

  const [, model = regex, opts] = /^\/(.*)\/(.*)$/.exec(regex) || []
  return new RegExp(model, opts)
}

module.exports = {
  colorizedLogTitle,
  exec,
  getStagedFiles,
  getStagedContents,
  largeOutputExec,
  loadPackageJSON,
  logAndExitWithTitle,
  pathFromRoot,
  printErrors,
  regexFromStr,
}
