const { expect } = require('chai')
const sinon = require('sinon')

const {
  colorizedLog,
  colorizedLogTitle,
  isTTY,
  parseContents,
  parseStagedContent,
  printErrors,
  regexFromStr,
  SEVERITY_PROPS,
} = require('./utils')

describe('utils', () => {
  describe('isTTY', () => {
    it('returns false for `error` level when stderr is not TTY', () => {
      const stubbedErrTTY = sinon
        .stub(process, 'stderr')
        .value({ isTTY: false })
      try {
        expect(isTTY('error')).to.be.false()
      } finally {
        stubbedErrTTY.restore()
      }
    })

    it('returns true for `error` level when stderr is TTY', () => {
      const stubbedErrTTY = sinon.stub(process, 'stderr').value({ isTTY: true })
      try {
        expect(isTTY('error')).to.be.true()
      } finally {
        stubbedErrTTY.restore()
      }
    })

    it('returns false for `success` level when stdout is not TTY', () => {
      const stubbedTTY = sinon.stub(process, 'stdout').value({ isTTY: false })
      try {
        expect(isTTY('success')).to.be.false()
      } finally {
        stubbedTTY.restore()
      }
    })

    it('returns true for `success` level when stdout is TTY', () => {
      const stubbedTTY = sinon.stub(process, 'stdout').value({ isTTY: true })
      try {
        expect(isTTY('success')).to.be.true()
      } finally {
        stubbedTTY.restore()
      }
    })
  })

  describe('colorizedLogTitle', () => {
    it('prints normal `console.log` if not TTY', () => {
      const spy = sinon.spy(console, 'log')
      try {
        for (const logLevel of ['error', 'warning', 'success']) {
          const [title, text] = [`${logLevel} title`, `${logLevel} message`]
          colorizedLogTitle({ logLevel, title, text, tty: false })
          expect(spy).to.have.been.calledWith(`${title}: ${text}`)
        }
      } finally {
        spy.restore()
      }
    })

    it('prints customized `console.log` depending on log level', () => {
      const spy = sinon.spy(console, 'log')
      try {
        for (const logLevel of ['error', 'warning', 'success']) {
          const [title, text] = [`${logLevel} title`, `${logLevel} message`]
          colorizedLogTitle({ logLevel, title, text, tty: true })
          const { color, icon } = SEVERITY_PROPS[logLevel]
          expect(spy).to.have.been.calledWith(
            `${color}${icon}  ${title}\x1b[0m: ${text}`
          )
        }
      } finally {
        spy.restore()
      }
    })
  })

  describe('colorizedLog', () => {
    it('prints normal `console.log` if not TTY', () => {
      const spy = sinon.spy(console, 'log')
      try {
        for (const logLevel of ['error', 'warning', 'success']) {
          const text = `${logLevel} message`
          colorizedLog({ logLevel, text, tty: false })
          expect(spy).to.have.been.calledWith(text)
        }
      } finally {
        spy.restore()
      }
    })

    it('prints customized `console.log` depending on log level', () => {
      for (const logLevel of ['error', 'warning', 'success']) {
        const { logMethod, color } = SEVERITY_PROPS[logLevel]
        const spy = sinon.spy(console, logMethod)
        try {
          const text = `${logLevel} message`
          colorizedLog({ logLevel, text, tty: true })
          expect(spy).to.have.been.calledWith(`${color}${text}\x1b[0m`)
        } finally {
          spy.restore()
        }
      }
    })
  })

  describe('parseContents', () => {
    const stagedContents = [
      { content: [[1, 'everything’s fine']], fileName: './javascript.js' },
      {
        content: [[2, 'what a beautiful FIXME here!']],
        fileName: './problem.js',
      },
      { content: [[3, 'here is a FIXME']], fileName: './ruby.rb' },
    ]

    it('returns empty arrays for errors and warnings when no problem is detected', () => {
      const pattern = { regex: /not found/ }
      const expectedResult = { errors: [], warnings: [] }

      const result = parseContents({ pattern, stagedContents })

      expect(result).to.deep.equal(expectedResult)
    })

    it('returns warnings when filter is non blocking and a problem is detected', () => {
      const pattern = { nonBlocking: true, regex: /FIXME/ }
      const expectedResult = {
        errors: [],
        warnings: ['./problem.js:2', './ruby.rb:3'],
      }

      const result = parseContents({ pattern, stagedContents })

      expect(result).to.deep.equal(expectedResult)
    })

    it('returns errors when filter is blocking and a problem is detected', () => {
      const pattern = { nonBlocking: false, regex: /FIXME/ }
      const expectedResult = {
        errors: ['./problem.js:2', './ruby.rb:3'],
        warnings: [],
      }

      const result = parseContents({ pattern, stagedContents })

      expect(result).to.deep.equal(expectedResult)
    })

    it('filters on file names', () => {
      const pattern = { filter: /\.js$/, nonBlocking: true, regex: /FIXME/ }
      const expectedResult = { errors: [], warnings: ['./problem.js:2'] }

      const result = parseContents({ pattern, stagedContents })

      expect(result).to.deep.equal(expectedResult)
    })
  })

  describe('parseStagedContent', () => {
    it('manages file addition with line jumps', () => {
      const initialContent = `
@@ -0,0 +1,5 @@
+# This is a title
+
+TODO
+
+Content with line jumps
+@@ -0,0 +1,5 @@ And fake git contents
+FIXME
      `
      const expectedResult = [
        [1, '# This is a title'],
        [2, ''],
        [3, 'TODO'],
        [4, ''],
        [5, 'Content with line jumps'],
        [6, '@@ -0,0 +1,5 @@ And fake git contents'],
        [7, 'FIXME'],
      ]

      expect(parseStagedContent(initialContent)).to.deep.equal(expectedResult)
    })

    it('return an array of objects with contents grouped by line number', () => {
      const initialContent = `
@@ -37 +39 @@ const gitShowStaged = (file) =>
-// When the process write stream is TTY…
+// If the process write stream is TTY…
@@ -43,2 +44,2 @@ function isTTY(logLevel) {
-error: blue
-warning: white
+error: red
+warning: yellow
@@ -118,0 +120,49 @@ async function loadPackageJSON() {
+const LINE_HUNK_REGEX = /@@ -(\\d+)/
+function parseStagedContent(content) {}
      `
      const expectedResult = [
        [39, '// If the process write stream is TTY…'],
        [44, 'error: red'],
        [45, 'warning: yellow'],
        [120, 'const LINE_HUNK_REGEX = /@@ -(\\d+)/'],
        [121, 'function parseStagedContent(content) {}'],
      ]

      expect(parseStagedContent(initialContent)).to.deep.equal(expectedResult)
    })
  })

  describe('printErrors', () => {
    const title = 'Hook title'

    it('returns false when there is no entry', () => {
      expect(
        printErrors({ logLevel: 'error', groupedErrors: [], title })
      ).to.be.false()
    })

    it('prints errors depending on their severity', () => {
      const groupedErrors = [
        {
          message: 'Fail!',
          errors: [[1, 'First error'], [42, 'Second error']],
        },
      ]
      const logTitle = sinon.spy()
      const log = sinon.spy()
      const levels = Object.entries(SEVERITY_PROPS)

      for (const [logLevel, { title: text }] of levels) {
        const res = printErrors({
          logLevel,
          groupedErrors,
          title,
          logTitle,
          log,
        })

        expect(res).to.be.true()
        expect(logTitle).to.have.been.calledOnce()
        expect(logTitle).to.have.been.calledWith({ logLevel, title, text })

        log.resetHistory()
        logTitle.resetHistory()
      }
    })
  })

  describe('regexFromStr', () => {
    it('converts regExp from string', () => {
      expect(regexFromStr('(?:FIXME|TODO)')).to.deep.equal(/(?:FIXME|TODO)/)
    })

    it('splits options when needed', () => {
      expect(regexFromStr('/^[<>|=]{4,}/m')).to.deep.equal(/^[<>|=]{4,}/m)
    })
  })
})
