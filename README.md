# Check staged contents before commiting

![version](https://img.shields.io/github/release/mbrehin/git-precommit-checks.svg)
![travis build](https://img.shields.io/travis/com/mbrehin/git-precommit-checks.svg)
![node version](https://img.shields.io/node/v/git-precommit-checks.svg)
![dev dependencies](https://img.shields.io/david/dev/mbrehin/git-precommit-checks.svg)
![vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/git-precommit-checks.svg)
![MIT license](https://img.shields.io/github/license/mbrehin/git-precommit-checks.svg)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

Because we love git hooks and npm, we want to share and automate code/content quality.

`git-precommit-checks` has to be loaded manually or using any wrapper around git hooks.

As you can read [below](#recommendations) we highly recommend Husky.

[How does it look like?](https://asciinema.org/a/216554)

## Install

`npm install --save-dev git-precommit-checks`

## How to setup my checking rules?

Configuration is loaded from _package.json_ so you can customize it according to your needs.

You can use the `--debug` option to print the path form where it is loaded.

Here is an example :

```JSON
"hooks": {
  "pre-commit": [
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

You can also filter on files patterns using the `filter` key.

Only `message` and `regex` keys are mandatory.

⚠️ _There is no default checks configured after install, so please be aware that nothing will happend without adding your own rules!_

## Recommendations

[Husky](https://github.com/typicode/husky) is a great tool to manage git hooks from your `package.json`.

You can use it and call `git-precommit-checks` on `pre-commit`:

```JSON
  "husky": {
    "hooks": {
      "pre-commit": "git-precommit-checks"
    }
  }
```
