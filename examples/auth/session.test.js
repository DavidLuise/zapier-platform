/* globals describe, it */
require('should');

const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);

describe('session auth app', () => {
  it('has an exchange for username/password', async () => {
    const bundle = {
      authData: {
        username: 'bryan',
        password: 'hunter2'
      }
    };

    const newAuthData = await appTester(
      App.authentication.sessionConfig.perform,
      bundle
    );

    newAuthData.sessionKey.should.eql('secret');
  });

  it('has auth details added to every request', async () => {
    const bundle = {
      authData: {
        sessionKey: 'secret'
      }
    };

    const response = await appTester(App.authentication.test, bundle);

    response.status.should.eql(200);
    response.request.headers['X-API-Key'].should.eql('secret');
  });
});
