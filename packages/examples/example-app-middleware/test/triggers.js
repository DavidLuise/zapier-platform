require('should');

const zapier = require('@zapier/zapier-platform-core');

const appTester = zapier.createAppTester(require('../index'));

describe('triggers', () => {

  describe('new recipe trigger', () => {
    it('should load recipes', (done) => {
      appTester('triggers.new_recipe')
        .then(results => {
          const firstRecipe = results[0];
          firstRecipe.name.should.eql('Smith Family Recipe');

          done();
        })
        .catch(done);
    });
  });

});