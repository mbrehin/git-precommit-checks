#!/usr/bin/env node
const {
  colorizedLogTitle,
  EXTERNAL_CONF_FILENAME,
  getStagedFiles,
  getStagedContents,
  loadJSONConfiguration,
  logAndExitWithTitle,
  parseContents,
  printErrors,
  printRulesSummary,
  printSummary,
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
  const { patterns, display } = await loadPatterns()

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

  display.verbose && console.log('Processing files…')

  for (const pattern of patterns) {
    const { errors, warnings } = parseContents({
      display,
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
  display.verbose && console.log('All files were parsed!')

  printSummary({
    warns: groupedwarnings,
    errs: groupedErrors,
    ...display,
  })

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
//  "git-precommit-checks": {
//    "rules": [
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
async function loadPatterns() {
  const config = await loadJSONConfiguration()
  const rules = config && config.rules

  // There is nothing to process if no conf is set
  if (!rules) {
    logAndExitWithTitle({
      logLevel: 'warning',
      text: `configuration is missing in "package.json" or "${EXTERNAL_CONF_FILENAME}".`,
      title: hookTitle,
    })
  }

  // Convert filter and regex into real RegExps
  const patterns = rules.map(
    ({ filter, message, nonBlocking = false, regex }) => {
      return {
        filter: regexFromStr(filter),
        message,
        nonBlocking,
        regex: regexFromStr(regex),
      }
    }
  )

  printRulesSummary({ config, rules: patterns })

  return { patterns, display: config.display || {} }
}

run().catch((err) => {
  console.log('Pre-commit checks failed due to unexpected error.', err)
})

// For testing purpose
module.exports = { parseContents }
