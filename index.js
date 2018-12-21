#!/usr/bin/env node
const {
  colorizedLogTitle,
  getStagedFiles,
  getStagedContents,
  loadPackageJSON,
  printErrors,
  regexFromStr,
} = require('./lib/utils')

const hookTitle = 'contents checks'

// Parse staged files and look for custom patterns.
// If a searched pattern is found, then print an associated message.
// A searched pattern is blocking by default.
// That means an error code will be return when exiting script.
// For non blocking patterns, errors will be logged as warnings
// but won't stop commit.
//
// Run `diff --staged` only once per file and cache results
// for later use, then run patterns search.
async function run() {
  const patterns = loadPatterns()
  const files = await getStagedFiles()
  // Cache staged contents (prevent multiple `git show :0:<file>` call)
  const stagedContents = await getStagedContents(files)
  // Initialize errors and warning as empty arrays
  const groupedErrors = {}
  const groupedwarnings = {}

  for (const pattern of patterns) {
    const { errors, warnings } = parseContents({ pattern, stagedContents })
    if (errors.length) {
      groupedErrors[pattern.message] = errors
    }
    if (warnings.length) {
      groupedwarnings[pattern.message] = warnings
    }
  }

  printErrors({
    logLevel: 'warning',
    errors: groupedwarnings,
    title: hookTitle,
  })
  const exit = printErrors({
    logLevel: 'error',
    errors: groupedErrors,
    title: hookTitle,
  })
  if (exit) {
    process.exit(1)
  }
  colorizedLogTitle({
    logLevel: 'success',
    title: hookTitle,
    text: 'everything went fine! Good job! 👏',
  })
}

// Load pre-commit configuration/patterns from `package.json`.
// Expected configuration is `hooks: { "pre-commit": … }`.
//
// Patterns are regexps to search inside new changes.
// Associated messages will be printed when pattern
// is matched in staged files contents.
// When a pattern is not blocking, then only print a
// warning, do not exit with error code.
// A pattern can be searched only on custom files
// described as a filter (regexp).
//
// Example:
// ```JSON
//  "hooks": {
//    "pre-commit": [
//      {
//        "message": "You’ve got leftover conflict markers",
//        "regex": "/^[<>|=]{4,}/m",
//      },
//      {
//        "filter": "\\.js$",
//        "message": "You’ve got leftover `console.log`",
//        "regex": "console\\.log"",
//      },
//      {
//        "message": "You have unfinished devs",
//        "nonBlocking": "true",
//        "regex": "(?:FIXME|TODO)",
//      },
//    ]
//  }
// ```
function loadPatterns() {
  const {
    hooks: { 'pre-commit': preCommit },
  } = loadPackageJSON()

  // There is nothing to process if no conf is set
  if (!preCommit) {
    colorizedLogTitle({
      logLevel: 'warning',
      title: hookTitle,
      text: 'configuration is missing in `package.json`.',
    })
    return
  }

  // Convert filter and regex into real RegExps
  const result = preCommit.map(
    ({ filter, message, nonBlocking = false, regex }) => {
      return {
        filter: regexFromStr(filter),
        message,
        nonBlocking,
        regex: regexFromStr(regex),
      }
    }
  )

  return result
}

// Read staged files content and check if any pattern is matched.
// If so, then list filenames for error and/or warnings.
function parseContents({
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
    if (!regex.test(content)) {
      continue
    }

    const container = nonBlocking ? warnings : errors
    container.push(fileName)
  }

  return { errors, warnings }
}

run()
