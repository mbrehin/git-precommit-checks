const util = require('util')
const nodeExec = util.promisify(require('child_process').exec)
const TEN_MEGA_BYTE = 1024 * 1024 * 10

// Notifications
const notifier = require('node-notifier')
const path = require('path')

// Used only for logging/debuggin
const Table = require('cli-table')

// Match hunk headers.
// Select previous line range with updated one to check
// for line moves.
const LINE_HUNK_REGEX = /^@@\s+-(?:\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?/

// Configuration filename
const EXTERNAL_CONF_FILENAME = 'git-precommit-checks.json'

// Logs colors
const SEVERITY_PROPS = {
  error: {
    color: '\x1b[31m',
    icon: '✖',
    logMethod: 'error',
    title: 'oops, something’s wrong!  😱\n',
  },
  warning: {
    color: '\x1b[33m',
    icon: '❗',
    logMethod: 'warn',
    title: 'there may be something to improve or fix!\n',
  },
  success: {
    color: '\x1b[32m',
    icon: '✔',
    logMethod: 'log',
    title: 'everything’s fine 👍',
  },
}
// Git commands
const gitDiffBase = 'git diff --staged --diff-filter=ACM --no-color'
// List added or updated file names only
const gitStagedFiles = `${gitDiffBase} --name-only`
// We don't use `git show :0:${file}` because we only want to
// process created or updated raws.
const gitShowStaged = (file) => `${gitDiffBase} --unified=0 -- "${file}"`

// Print error with color depending on given severity.
// - error: red
// - warning: yellow
// - standard: green
function colorizedLog({ logLevel, text, tty = isTTY(logLevel) }) {
  // Colors code won’t be used if not in TTY
  if (!tty) {
    console.log(text)
    return
  }
  const { color, logMethod } = SEVERITY_PROPS[logLevel]
  console[logMethod](`${color}${text}\x1b[0m`)
}

// Print
function colorizedLogTitle({ logLevel, title, text, tty = isTTY(logLevel) }) {
  if (!tty) {
    console.log(`${title}: ${text}`)
    return
  }
  const { color, icon } = SEVERITY_PROPS[logLevel]
  console.log(`${color}${icon}  ${title}\x1b[0m: ${text}`)
}

// Wrap large output exec with automatic log on error
function exec(command, hookTitle, options = {}) {
  return largeOutputExec(command).catch((err) =>
    logAndExitWithTitle({
      text: `Couldn’t run 'exec' command: ${err}`,
      title: hookTitle,
    })
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
  const content = parseStagedContent(stdout)
  return { fileName: `./${file}`, content }
}

// Load staged contents for later parsing.
// This won't load `pre-commit` files contents.
function getStagedContents(files) {
  return Promise.all(
    files.filter((file) => !/pre-commit$/.test(file)).map(getStagedContent)
  )
}

// If the process write stream is TTY, then we can print with colors
function isTTY(logLevel) {
  return logLevel === 'error' ? process.stderr.isTTY : process.stdout.isTTY
}

// Because we need more than default output…
function largeOutputExec(command, options = {}) {
  return nodeExec(command, { maxBuffer: TEN_MEGA_BYTE, ...options })
}

// Load configuration from closest `git-precommit-checks.json`
async function loadJSONConfiguration() {
  const findUp = require('find-up')
  const loadJsonFile = require('load-json-file')
  const path = await findUp(EXTERNAL_CONF_FILENAME)

  return path ? loadJsonFile(path) : loadPackageJSON()
}

// Load configuration as JSON from closest package.json
async function loadPackageJSON() {
  const readPkgUp = require('read-pkg-up')
  const { pkg, path } = await readPkgUp()
  if (!path) {
    console.log('⚠️ No "package.json" found. Unable to load configuration!')
  }

  return pkg && pkg['git-precommit-checks']
}

// Output an error using red color, then exit program
function logAndExitWithTitle({ logLevel = 'error', text, title }) {
  colorizedLogTitle({
    logLevel,
    title,
    text,
  })
  // EX_DATAERR (65): The input data was incorrect in some way
  process.exit(65)
}

// Use system notification when errors happend.
function notifyErrors({ message, kind }) {
  const title =
    kind === 'error'
      ? 'Pre-commit checks failed!'
      : 'Pre-commit checks: you’ve got warnings!'
  notifier.notify({
    title,
    icon: path.join(__dirname, '..', 'assets', `checks-${kind}.png`),
    message,
  })
}

// Read staged files content and check if any pattern is matched.
// If so, then list filenames for error and/or warnings.
function parseContents({
  display: { offendingContent: printContent, verbose } = {},
  pattern: { filter, nonBlocking, regex },
  stagedContents,
}) {
  const errors = []
  const warnings = []

  for (const { content, fileName } of stagedContents) {
    // Skip file if it does not match filter (and skip self)
    if (filter && !filter.test(fileName)) {
      continue
    }

    let matchFound = false
    // Loop over each staged line in file
    for (const [lineNumber, text] of content) {
      if (!regex.test(text)) {
        continue
      }

      if (verbose) {
        matchFound = true
        console.log(
          `Match found in "${fileName}" at ${lineNumber} using regex "${regex}"`
        )
      }

      const container = nonBlocking ? warnings : errors
      // Use `filename:lineo` pattern for logging in order to
      // enable quick-open on editors.
      container.push(
        `${fileName}:${lineNumber}${
          printContent ? ' : ' + text.trimLeft() : ''
        }`
      )
    }

    if (!matchFound && verbose) {
      console.log(`No match found in "${fileName}" using regex "${regex}"`)
    }
  }

  return { errors, warnings }
}

// Group stage lines with their number.
// This is for summary display purpose because we
// wan't to enable direct links to offending lines.
//
// Example:
//
// Input:
//
// @@ -35 +35,2 @@
// `${gitDiffBase} --unified=0 ${file}`
// @@ -37 +38 @@ const gitShowStaged = (file) =>
// // If the process write stream …
// @@ -43,2 +44,2 @@
// error: red
// warning: yellow
// @@ -118,0 +120,49 @@
// const LINE_HUNK_REGEX = /@@ -(\\d+)/
// function parseStagedContent(content) {}
//
// Result: array of object with lineNumber as key,
// associated contents as values.
//
// [
//  [37, '// If the process write stream …'],
//  [43, 'error: red']
//  [44, 'warning: yellow']
//  [118, 'const LINE_HUNK_REGEX = /@@ -(\\d+)/'],
//  [119, 'function parseStagedContent(content) {}'],
// ]
function parseStagedContent(content) {
  let currentGroupNumber
  return (
    content
      .trim()
      // Split rows
      .split(/\r\n|\r|\n/)
      // Only keep lines starting with `@@` or `+`
      // (except stats lines like `+++ i/lib/utils.js`)
      .filter((line) => /^(\+(?!\+\+\s)|@@)/.test(line))
      // then manage line counter with associated contents
      .reduce((acc, text) => {
        const newLineNumber = text.match(LINE_HUNK_REGEX)
        if (newLineNumber) {
          currentGroupNumber = Number(newLineNumber[1])
        } else if (currentGroupNumber) {
          acc.push([currentGroupNumber, text.replace(/^\+/, '')])
          currentGroupNumber += 1
        }
        return acc
      }, [])
  )
}

// Loop over errors and print them.
// Each errors group will be prefixed by its message, ie.:
//
// ```
// === You’ve got leftover conflict markers ===
// File1
// File2
// ```
//
// Function takes log functions as parameters to make it
// pure and simplify unit testing.
function printErrors({
  logLevel,
  groupedErrors,
  title,
  logTitle = colorizedLogTitle,
  log = colorizedLog,
}) {
  if (groupedErrors.length === 0) {
    return false
  }

  const text = SEVERITY_PROPS[logLevel].title
  logTitle({ logLevel, title, text })

  for (const { message, errors } of groupedErrors) {
    const subTitle = `=== ${message} ===`
    const text = [subTitle, ...errors].join('\n') + '\n'
    log({ logLevel, text })
  }

  return true
}

// Print rules as table
function printRulesSummary({ config, rules }) {
  if (config.display && config.display.rulesSummary) {
    const table = new Table({
      head: ['Filter', 'Message', 'Blocking', 'Patter/regex'],
    })
    for (const { filter = '*', message, nonBlocking, regex } of rules) {
      table.push([filter, message, !nonBlocking, regex.toString()])
    }
    console.log(`\n${table.toString()}\n`)
  }
}

// Print a short summary of errors and warnings count.
// Example: `3 errors, no warnings`
function printSummary({
  warns,
  errs,
  notifications,
  shortStats: printOnConsole,
}) {
  // If short stats are not expected to be printed on console or using system
  // notification then there's nothing to do.
  if (!printOnConsole && !notifications) {
    return
  }

  // Get pluralized label
  const label = (count, baseLabel) => {
    if (count === 0) {
      return `No ${baseLabel}s`
    }
    return `${count} ${baseLabel}${count > 1 ? 's' : ''}`
  }
  const sum = (entries) =>
    entries.reduce((acc, { errors: { length } }) => acc + length, 0)

  const errCount = sum(errs)
  const warnCount = sum(warns)
  const errLabel = label(errCount, 'error')
  const warnLabel = label(warnCount, 'warning')
  const message = `${errLabel}, ${warnLabel.toLocaleLowerCase()}`
  // Only prints on console when asked to
  if (printOnConsole) {
    console.log(`${message}.\n`)
  }

  if (notifications && errCount + warnCount > 0) {
    const kind = errCount > 0 ? 'error' : 'warning'
    notifyErrors({ message, kind })
  }
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
  colorizedLog,
  colorizedLogTitle,
  exec,
  EXTERNAL_CONF_FILENAME,
  getStagedFiles,
  getStagedContents,
  isTTY,
  largeOutputExec,
  loadJSONConfiguration,
  logAndExitWithTitle,
  parseContents,
  parseStagedContent,
  printRulesSummary,
  printErrors,
  printSummary,
  regexFromStr,
  SEVERITY_PROPS,
}
