const { expect } = require('chai')

const { parseContents } = require('./index.js')

describe('parseContents', () => {
  const stagedContents = [
    { content: 'everything’s fine', fileName: 'javascript.js' },
    { content: 'what a beautiful FIXME here!', fileName: 'problem.js' },
    { content: 'here is a FIXME', fileName: 'ruby.rb' },
  ]

  it('returns empty arrays for errors and warnings when no problem is detected', () => {
    const pattern = { regex: /not found/ }
    const expectedResult = { errors: [], warnings: [] }

    const result = parseContents({ pattern, stagedContents })

    expect(result).to.deep.equal(expectedResult)
  })

  it('returns warnings when filter is non blocking and a problem is detected', () => {
    const pattern = { nonBlocking: true, regex: /FIXME/ }
    const expectedResult = { errors: [], warnings: ['problem.js', 'ruby.rb'] }

    const result = parseContents({ pattern, stagedContents })

    expect(result).to.deep.equal(expectedResult)
  })

  it('returns errors when filter is blocking and a problem is detected', () => {
    const pattern = { nonBlocking: false, regex: /FIXME/ }
    const expectedResult = { errors: ['problem.js', 'ruby.rb'], warnings: [] }

    const result = parseContents({ pattern, stagedContents })

    expect(result).to.deep.equal(expectedResult)
  })

  it('filters on file names', () => {
    const pattern = { filter: /\.js$/, nonBlocking: true, regex: /FIXME/ }
    const expectedResult = { errors: [], warnings: ['problem.js'] }

    const result = parseContents({ pattern, stagedContents })

    expect(result).to.deep.equal(expectedResult)
  })
})
