module.exports = {
  display: {
    notifications: true,
    offendingContent: true,
    rulesSummary: false,
    shortStats: true,
    verbose: false,
  },
  rules: [
    {
      message: 'You’ve got leftover conflict markers',
      regex: /^[<>|=]{4,}/m,
    },
    {
      filter: /^README(_fr)?\.md$/,
      message: 'You have unfinished devs',
      nonBlocking: true,
      regex: /(?:FIXME|TODO)/,
    },
  ],
}
