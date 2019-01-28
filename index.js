#!/usr/bin/env node
const {
  colorizedLogTitle,
  getStagedFiles,
  getStagedContents,
  loadPackageJSON,
  printErrors,
  printSummary,
  regexFromStr,
} = require('./lib/utils')

// Used only for logging/debuggin
var Table = require('cli-table')

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
async function run(debug = false) {
  const patterns = await loadPatterns(debug)

  // Skip processing when no conf is set
  if (!patterns) {
    return
  }

  const files = await getStagedFiles()
  // Skip processing when no file is staged
  if (!files.length) {
    colorizedLogTitle({
      logLevel: 'warning',
      title: hookTitle,
      text: 'there is no file to check. Did you forget to `git add…`?',
    })
    return
  }

  // Cache staged contents (prevent multiple `git show :0:<file>` call)
  const stagedContents = await getStagedContents(files)
  // Initialize errors and warning as empty arrays
  const groupedErrors = []
  const groupedwarnings = []

  if (debug) {
    console.log('Processing files…')
  }

  for (const pattern of patterns) {
    const { errors, warnings } = parseContents({
      debug,
      pattern,
      stagedContents,
    })
    if (errors.length) {
      groupedErrors.push({ message: pattern.message, errors })
    }
    if (warnings.length) {
      groupedwarnings.push({ message: pattern.message, errors: warnings })
    }
  }
  if (debug) {
    console.log('All files were parsed!')
    printSummary(groupedwarnings, groupedErrors)
  }

  printErrors({
    logLevel: 'warning',
    groupedErrors: groupedwarnings,
    title: hookTitle,
  })
  const exit = printErrors({
    logLevel: 'error',
    groupedErrors,
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
async function loadPatterns(debug) {
  const { hooks } = await loadPackageJSON(debug)
  const preCommit = hooks && hooks['pre-commit']

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

  // Print rules as table on debug mode
  if (debug) {
    const table = new Table({
      head: ['Filter', 'Message', 'Blocking', 'Patter/regex'],
    })
    for (const { filter = '*', message, nonBlocking, regex } of result) {
      table.push([filter, message, !nonBlocking, regex.toString()])
    }
    console.log(`\n${table.toString()}\n`)
  }

  return result
}

// Read staged files content and check if any pattern is matched.
// If so, then list filenames for error and/or warnings.
function parseContents({
  debug,
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

      if (debug) {
        matchFound = true
        console.log(
          `Match found in "${fileName}" at ${lineNumber} using regex "${regex}"`
        )
      }

      const container = nonBlocking ? warnings : errors
      // Use `filename:lineo` pattern for logging in order to
      // enable quick-open on editors.
      container.push(`${fileName}:${lineNumber}${debug ? ' : ' + text : ''}`)
    }

    if (!matchFound && debug) {
      console.log(`No match found in "${fileName}" using regex "${regex}"`)
    }
  }

  return { errors, warnings }
}

// Because there is only one expected option,
// we don't need to load an extra module like commander.
const debug = process.argv[2] === '--debug'
run(debug)

// For testing purpose
module.exports = { parseContents }
