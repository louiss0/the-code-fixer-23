function readRootPackageJson(tree) {
    try {
        const raw = tree.read('package.json', 'utf-8');
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function hasDep(pkg, name) {
    const deps = pkg?.dependencies ?? {};
    const devDeps = pkg?.devDependencies ?? {};
    return Boolean(deps[name] || devDeps[name]);
}
export function detectTestRunnerFromRootPackageJson(tree) {
    const pkg = readRootPackageJson(tree) ?? {};
    const candidates = [];
    if (hasDep(pkg, 'jest'))
        candidates.push('jest');
    if (hasDep(pkg, 'vitest'))
        candidates.push('vitest');
    if (candidates.length === 1) {
        return { detected: candidates[0], candidates };
    }
    return { detected: null, candidates };
}
export function detectLinterFromRootPackageJson(tree) {
    const pkg = readRootPackageJson(tree) ?? {};
    const candidates = [];
    if (hasDep(pkg, 'eslint'))
        candidates.push('eslint');
    if (hasDep(pkg, '@biomejs/biome'))
        candidates.push('biome');
    if (candidates.length === 1) {
        return { detected: candidates[0], candidates };
    }
    return { detected: null, candidates };
}
export function detectFormatterFromRootPackageJson(tree) {
    const pkg = readRootPackageJson(tree) ?? {};
    const candidates = [];
    if (hasDep(pkg, 'prettier'))
        candidates.push('prettier');
    if (hasDep(pkg, '@biomejs/biome'))
        candidates.push('biome');
    if (hasDep(pkg, '@stylistic/eslint-plugin'))
        candidates.push('eslint-stylistic');
    if (candidates.length === 1) {
        return { detected: candidates[0], candidates };
    }
    return { detected: null, candidates };
}
