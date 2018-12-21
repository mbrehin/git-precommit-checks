// Generic Chai plugin registration
// --------------------------------

const chai = require('chai')
const createChaiJestDiff = require('chai-jest-diff').default
const dirtyChai = require('dirty-chai')
const sinonChai = require('sinon-chai')

chai
  .use(createChaiJestDiff())
  .use(sinonChai)
  .use(dirtyChai)
