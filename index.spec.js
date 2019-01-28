const { expect } = require('chai')

const { parseContents } = require('./index.js')

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
