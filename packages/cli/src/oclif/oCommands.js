// this is needed for the old help command so it can import new command info

module.exports = {
  analytics: require('./commands/analytics'),
  apps: true,
  build: require('./commands/build'),
  deprecate: require('./commands/deprecate'),
  env: true, // used so that aliases are properly routed into ocli, but `env` itself doesn't show in help/docs
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
  team: true,
  'team:add': require('./commands/team/add'),
  'team:get': require('./commands/team/get'),
  'team:remove': require('./commands/team/remove'),
  test: require('./commands/test'),
  upload: require('./commands/upload'),
  users: true,
  'users:add': require('./commands/users/add'),
  'users:get': require('./commands/users/get'),
  'users:links': require('./commands/users/links'),
  'users:remove': require('./commands/users/remove'),
  validate: require('./commands/validate'),
  versions: require('./commands/versions')
};
