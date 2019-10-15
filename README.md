# Check staged contents before commiting

![version](https://img.shields.io/github/release/mbrehin/git-precommit-checks.svg)
![travis build](https://img.shields.io/travis/com/mbrehin/git-precommit-checks.svg)
![node version](https://img.shields.io/node/v/git-precommit-checks.svg)
![dev dependencies](https://img.shields.io/david/dev/mbrehin/git-precommit-checks.svg)
![vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/git-precommit-checks.svg)
![MIT license](https://img.shields.io/github/license/mbrehin/git-precommit-checks.svg)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

Documentation also available in French: [![🇫🇷 Traduction française 🇫🇷](https://img.shields.io/badge/FR-Traduction%20fran%C3%A7aise-blue.svg)](https://github.com/mbrehin/git-precommit-checks/blob/master/README_fr.md)

Because we love git hooks and npm, we want to share and automate code/content quality.

`git-precommit-checks` has to be loaded manually or using any wrapper around git hooks.

As you can read [below](#running-git-precommit-checks-with-husky) we highly recommend Husky.

[How does it look?](https://asciinema.org/a/224134)

## Install

`npm install --save-dev git-precommit-checks`

## How to setup my checking rules?

Configuration is loaded from _git-precommit-checks.json_ (from the project root/top level directory) or _package.json_ so you can customize it according to your needs.

Here is an example using _git-precommit-checks.json_ configuration file:

```js
{
  "rules": [
    {
      "filter": "\\.js$",
      "nonBlocking": "true",
      "message": "You’ve got leftover `console.log`",
      "regex": "console\\.log"
    },
    {
      "message": "You’ve got leftover conflict markers",
      "regex": "/^[<>|=]{4,}/m"
    },
    {
      "message": "You have unfinished devs",
      "nonBlocking": "true",
      "regex": "(?:FIXME|TODO)"
    }
  ]
}
```

When using _package.json_ file, you must add a dedicated `git-precommit-checks` key:

```js
"git-precommit-checks": {
  "rules": [
    {
      "filter": "\\.js$",
      "nonBlocking": "true",
      "message": "You’ve got leftover `console.log`",
      "regex": "console\\.log"
    },
    {
      "message": "You’ve got leftover conflict markers",
      "regex": "/^[<>|=]{4,}/m"
    },
    {
      "message": "You have unfinished devs",
      "nonBlocking": "true",
      "regex": "(?:FIXME|TODO)"
    }
  ]
}
```

Each "pre-commit" entry is a checking rule: the pattern describes a regular expression that will be searched upon staged content. The associated message is displayed when the pattern is found.

Each rule will stop the commit when the associated pattern is found unless you set the `nonBlocking` key to `true`. Non blocking rules will print warning messages.

Only `message` and `regex` keys are mandatory.

You can also filter on files patterns using the `filter` key.

For instance, you'll get a warning about your `package.json` the first time you set the `FIXME/TODO` rule and every time you update that line. If you want to prevent such a warning you can extend that rule like this:

```js
  {
    "filter": "^package\\.json$",
    "message": "You have unfinished devs",
    "nonBlocking": "true",
    "regex": "(?:FIXME|TODO)"
  }
```

⚠️ _There is no default checks configured after install, so please be aware that nothing will happend without adding your own rules!_

## Display options

You can add an optional `display` entry in your config to enable some options:

```js
"git-precommit-checks": {
  "display": {
    "notifications": true,
    "offending-content": true,
    "rules-summary": true,
    "short-stats": true,
    "verbose": true
  },
  …
```

- `notifications`: print error/warning summary using system notification.
- `offending-content`: print offending contents right after associated file path and line number.
- `rules-summary`: print rules as a table before parsing staged files.
- `short-stats`: print short stats (ie. `1 error, 1 warning.`).
- `verbose`: print every performed action, files parsed, short summary/stats (errors and warnings number).

## Usage

### Triggering it straight with git hooks

After installing locally or globally your module, add the following code (or equivalent) to your project pre-commit hook `.git/hooks/pre-commit`:

```bash
#!/bin/sh
scriptName="git-precommit-checks"
scriptPath="$(npm bin)/$scriptName"

if [ -f $scriptPath ]; then
  $scriptPath
else
  echo "Can't find $scriptName module"
  echo "You can reinstall it using 'npm install $scriptName --save-dev' or delete this hook"
fi
```

### Running _git-precommit-checks_ with Husky

[Husky](https://github.com/typicode/husky) is a great tool to manage git hooks from your `package.json`.

You can use it and call `git-precommit-checks` on `pre-commit`:

```js
  "husky": {
    "hooks": {
      "pre-commit": "git-precommit-checks"
    }
  }
```

## Contributing

Any contribution is welcomed. Here is our [contribution guideline](CONTRIBUTING.md)
