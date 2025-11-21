declare module 'eslint-plugin-github' {
    import type { Linter } from 'eslint'

    interface FlatConfig extends Linter.Config {
        name?: string
    }

    interface GitHubPlugin {
        default?: GitHubPlugin
        configs?: Record<string, FlatConfig | FlatConfig[]>
        getFlatConfigs: (
            name?: string
        ) => Record<string, FlatConfig | FlatConfig[]>
        rules?: Record<string, unknown>
    }

    const plugin: GitHubPlugin
    export default plugin
}

