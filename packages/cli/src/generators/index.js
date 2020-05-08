const path = require('path');

const { merge } = require('lodash');
const filter = require('gulp-filter');
const Generator = require('yeoman-generator');
const prettier = require('gulp-prettier');

const { PACKAGE_VERSION, PLATFORM_PACKAGE } = require('../constants');
const authFilesCodegen = require('../utils/auth-files-codegen');

const writeGenericReadme = (gen) => {
  gen.fs.copyTpl(
    gen.templatePath('README.template.md'),
    gen.destinationPath('README.md'),
    { name: gen.options.packageName }
  );
};

const appendReadme = (gen) => {
  const content = gen.fs.read(
    gen.templatePath(gen.options.template, 'README.md'),
    { defaults: '' }
  );
  if (content) {
    gen.fs.append(gen.destinationPath('README.md'), '\n' + content);
  }
};

const writeGitignore = (gen) => {
  gen.fs.copy(gen.templatePath('gitignore'), gen.destinationPath('.gitignore'));
};

const writeGenericPackageJson = (gen, packageJsonExtension) => {
  gen.fs.writeJSON(
    'package.json',
    merge(
      {
        name: gen.options.packageName,
        version: '1.0.0',
        description: '',
        main: 'index.js',
        scripts: {
          test: 'jest --testTimeout 10000',
        },
        dependencies: {
          [PLATFORM_PACKAGE]: PACKAGE_VERSION,
        },
        devDependencies: {
          jest: '^25.5.3',
        },
        private: true,
      },
      packageJsonExtension
    )
  );
};

const writeGenericIndex = (gen) => {
  gen.fs.copyTpl(
    gen.templatePath('index.template.js'),
    gen.destinationPath('index.js'),
    { corePackageName: PLATFORM_PACKAGE }
  );
};

const authTypes = {
  'basic-auth': 'basic',
  'custom-auth': 'custom',
  'digest-auth': 'digest',
  'oauth1-trello': 'oauth1',
  oauth2: 'oauth2',
  'session-auth': 'session',
};

const writeGenericAuth = (gen) => {
  const authType = authTypes[gen.options.template];
  const content = authFilesCodegen[authType]();
  gen.fs.write('authentication.js', content);
};

const writeGenericAuthTest = (gen) => {
  const authType = authTypes[gen.options.template];
  gen.fs.copyTpl(
    gen.templatePath(`authTests/${authType || 'generic'}.test.js`),
    gen.destinationPath('test/authentication.test.js')
  );
};

// Write files for templates that demonstrate an auth type
const writeForAuthTemplate = (gen) => {
  writeGitignore(gen);
  writeGenericReadme(gen);
  writeGenericPackageJson(gen);
  writeGenericIndex(gen);
  writeGenericAuth(gen);
  writeGenericAuthTest(gen);
};

// Write files for "standalone" templates, which essentially just copies an
// example directory
const writeForStandaloneTemplate = (gen) => {
  writeGitignore(gen);

  writeGenericReadme(gen);
  appendReadme(gen);

  const packageJsonExtension = {
    // Put template-specific package.json settings here, grouped by template
    // names. This is going to used to extend the generic package.json.
    files: {
      dependencies: {
        'form-data': '3.0.0',
      },
    },
    typescript: {
      scripts: {
        build: 'npm run clean && tsc',
        clean: 'rimraf ./lib ./build',
        watch: 'npm run clean && tsc --watch',
        test: 'npm run build && jest --testTimeout 10000 --rootDir ./lib/test',
      },
      devDependencies: {
        '@types/jest': '^25.2.1',
        '@types/node': '^13.13.5',
        rimraf: '^3.0.2',
        typescript: '^3.8.3',
      },
    },
  }[gen.options.template];

  writeGenericPackageJson(gen, packageJsonExtension);

  gen.fs.copy(
    gen.templatePath(gen.options.template, '**', '*.{js,json,ts}'),
    gen.destinationPath()
  );
};

const TEMPLATE_ROUTES = {
  'basic-auth': writeForAuthTemplate,
  'custom-auth': writeForAuthTemplate,
  'digest-auth': writeForAuthTemplate,
  'dynamic-dropdown': writeForStandaloneTemplate,
  files: writeForStandaloneTemplate,
  minimal: null,
  'oauth1-trello': writeForAuthTemplate,
  oauth2: writeForAuthTemplate,
  'search-or-create': writeForStandaloneTemplate,
  'session-auth': writeForAuthTemplate,
  typescript: writeForStandaloneTemplate,
};

const TEMPLATE_CHOICES = Object.keys(TEMPLATE_ROUTES);

class ProjectGenerator extends Generator {
  initializing() {
    this.sourceRoot(path.resolve(__dirname, 'templates'));
    this.destinationRoot(path.resolve(this.options.path));

    const jsFilter = filter(['*.js', '*.json'], { restore: true });
    this.registerTransformStream([
      jsFilter,
      prettier({ singleQuote: true }),
      jsFilter.restore,
    ]);
  }

  async prompting() {
    if (!this.options.template) {
      this.answers = await this.prompt([
        {
          type: 'list',
          name: 'template',
          choices: TEMPLATE_CHOICES,
          message: 'Choose a project template to start with:',
          default: 'minimal',
        },
      ]);
      this.options.template = this.answers.template;
    }
  }

  writing() {
    this.options.packageName = path.basename(this.options.path);

    const writeFunc = TEMPLATE_ROUTES[this.options.template];
    writeFunc(this);
  }
}

module.exports = {
  TEMPLATE_CHOICES,
  ProjectGenerator,
};
