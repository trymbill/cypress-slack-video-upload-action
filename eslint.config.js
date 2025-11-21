"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eslint_plugin_github_1 = __importDefault(require("eslint-plugin-github"));
const eslint_plugin_jest_1 = __importDefault(require("eslint-plugin-jest"));
const typescript_eslint_1 = __importDefault(require("typescript-eslint"));
const globals_1 = __importDefault(require("globals"));
const githubConfigs = eslint_plugin_github_1.default.getFlatConfigs('recommended');
const githubRecommended = githubConfigs.recommended;
const githubTypeScript = githubConfigs.typescript;
exports.default = typescript_eslint_1.default.config({
    ignores: ['dist/', 'lib/', 'node_modules/']
}, githubRecommended, ...(Array.isArray(githubTypeScript) ? githubTypeScript : [githubTypeScript]), {
    languageOptions: {
        parser: typescript_eslint_1.default.parser,
        parserOptions: {
            ecmaVersion: 9,
            sourceType: 'module',
            project: './tsconfig.json'
        },
        globals: Object.assign(Object.assign({}, globals_1.default.node), globals_1.default.es2021)
    },
    plugins: {
        jest: eslint_plugin_jest_1.default
    },
    rules: {
        'i18n-text/no-en': 'off',
        'eslint-comments/no-use': 'off',
        'import/no-namespace': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/explicit-member-accessibility': [
            'error',
            { accessibility: 'no-public' }
        ],
        '@typescript-eslint/no-require-imports': 'error',
        '@typescript-eslint/array-type': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/ban-ts-comment': 'error',
        camelcase: 'off',
        '@typescript-eslint/consistent-type-assertions': 'error',
        '@typescript-eslint/explicit-function-return-type': [
            'error',
            { allowExpressions: true }
        ],
        '@typescript-eslint/no-array-constructor': 'error',
        '@typescript-eslint/no-empty-interface': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-extraneous-class': 'error',
        '@typescript-eslint/no-for-in-array': 'error',
        '@typescript-eslint/no-inferrable-types': 'error',
        '@typescript-eslint/no-misused-new': 'error',
        '@typescript-eslint/no-namespace': 'error',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/no-unnecessary-qualifier': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/no-useless-constructor': 'error',
        '@typescript-eslint/no-var-requires': 'error',
        '@typescript-eslint/prefer-for-of': 'warn',
        '@typescript-eslint/prefer-function-type': 'warn',
        '@typescript-eslint/prefer-includes': 'error',
        '@typescript-eslint/prefer-string-starts-ends-with': 'error',
        '@typescript-eslint/promise-function-async': 'error',
        '@typescript-eslint/require-array-sort-compare': 'error',
        '@typescript-eslint/restrict-plus-operands': 'error',
        semi: 'off',
        '@typescript-eslint/unbound-method': 'error'
    }
}, Object.assign(Object.assign({ files: ['**/*.test.ts', '**/*.test.js'] }, eslint_plugin_jest_1.default.configs['flat/recommended']), { languageOptions: {
        globals: Object.assign({}, eslint_plugin_jest_1.default.environments.globals.globals)
    } }));
