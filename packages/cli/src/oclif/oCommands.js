// this is needed for the old help command so it can import new command info

module.exports = {
  analytics: require('./commands/analytics'),
  apps: true,
  build: require('./commands/build'),
  deprecate: require('./commands/deprecate'),
  delete: true,
  'delete:integration': require('./commands/delete/integration'),
  'delete:version': require('./commands/delete/version'),
  env: true, // used so that subcommands are properly routed into ocli, but `env` itself doesn't show in help/docs
  'env:get': require('./commands/env/get'),
  'env:set': require('./commands/env/set'),
  'env:unset': require('./commands/env/unset'),
  history: require('./commands/history'),
  init: require('./commands/init'),
  integrations: require('./commands/integrations'),
  login: require('./commands/login'),
  logout: require('./commands/logout'),
  migrate: require('./commands/migrate'),
  promote: require('./commands/promote'),
  push: require('./commands/push'),
  scaffold: require('./commands/scaffold'),
  test: require('./commands/test'),
  upload: require('./commands/upload'),
  validate: require('./commands/validate'),
  versions: require('./commands/versions')
};
