const { expect } = require('chai')
const sinon = require('sinon')

const {
  colorizedLog,
  colorizedLogTitle,
  isTTY,
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

  describe('printErrors', () => {
    const title = 'Hook title'

    it('returns false when there is no entry', () => {
      expect(
        printErrors({ logLevel: 'error', errors: [], title })
      ).to.be.false()
    })

    it('prints errors depending on their severity', () => {
      const errors = ['First error', 'Second error']
      const logTitle = sinon.spy()
      const log = sinon.spy()
      const levels = Object.entries(SEVERITY_PROPS)

      for (const [logLevel, { title: text }] of levels) {
        const res = printErrors({ logLevel, errors, title, logTitle, log })

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
