const {
  colorizedLog,
  colorizedLogTitle,
  printErrors,
  regexFromStr,
  SEVERITY_PROPS,
} = require('./utils')

describe('utils', () => {
  describe('colorizedLogTitle', () => {
    it('prints customized `console.log` depending on log level', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
      try {
        for (const kind of ['error', 'warning', 'success']) {
          const [title, message] = [`${kind} title`, `${kind} message`]
          colorizedLogTitle(kind, title, message)
          const { color, icon } = SEVERITY_PROPS[kind]
          expect(spy).toHaveBeenCalledWith(
            `${color}${icon}  ${title}\x1b[0m: ${message}`
          )
        }
      } finally {
        spy.mockRestore()
      }
    })
  })

  describe('colorizedLog', () => {
    // TODO: mock `isTTY()` and return false
    // it.skip('prints normal `console.log` if not TTY', () => {
    //   const utilsSpy = jest
    //     .spyOn(utils, 'isTTY')
    //     .mockImplementation(() => false)
    //   const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
    //   try {
    //     for (const kind of ['error', 'warning', 'success']) {
    //       const message = `${kind} message`
    //       colorizedLog(kind, message)
    //       expect(spy).toHaveBeenCalledWith(message)
    //     }
    //   } finally {
    //     spy.mockRestore()
    //     utilsSpy.mockRestore()
    //   }
    // })

    it('prints customized `console.log` depending on log level', () => {
      for (const kind of ['error', 'warning', 'success']) {
        const { logMethod, color } = SEVERITY_PROPS[kind]
        const spy = jest.spyOn(console, logMethod).mockImplementation(() => {})
        try {
          const message = `${kind} message`
          colorizedLog(kind, message)
          expect(spy).toHaveBeenCalledWith(`${color}${message}\x1b[0m`)
        } finally {
          spy.mockRestore()
        }
      }
    })
  })

  describe('printErrors', () => {
    it('returns false when there is no entry', () => {
      expect(printErrors('error', [], 'hook title')).toBe(false)
    })
    it.skip('prints errors depending on their severity', () => {})
  })

  describe('regexFromStr', () => {
    it('converts regExp from string', () => {
      expect(regexFromStr('(?:FIXME|TODO)')).toEqual(/(?:FIXME|TODO)/)
    })

    it('splits options when needed', () => {
      expect(regexFromStr('/^[<>|=]{4,}/m')).toEqual(/^[<>|=]{4,}/m)
    })
  })
})
