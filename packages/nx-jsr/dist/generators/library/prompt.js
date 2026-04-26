export function isInteractive() {
    // NX_INTERACTIVE can force interactivity
    const nxInteractive = process.env.NX_INTERACTIVE;
    if (nxInteractive === 'true')
        return true;
    if (nxInteractive === 'false')
        return false;
    const isCi = /^1|true$/i.test(String(process.env.CI ?? ''));
    const tty = typeof process.stdout !== 'undefined' && process.stdout.isTTY === true;
    return !isCi && tty;
}
export async function selectOrDefault(question, choices, defaultChoice) {
    if (!isInteractive())
        return defaultChoice;
    try {
        // Lazy import to avoid hard dependency in non-interactive/CI
        const mod = (await import('enquirer'));
        const Select = mod.Select ?? mod.default?.Select;
        if (Select) {
            const prompt = new Select({ name: 'choice', message: question, choices });
            const answer = await prompt.run();
            return typeof answer === 'string' ? answer : defaultChoice;
        }
        // Fallback to generic prompt API if available
        if (typeof mod.prompt === 'function') {
            const res = await mod.prompt({
                type: 'select',
                name: 'choice',
                message: question,
                choices,
            });
            return res?.choice ?? defaultChoice;
        }
    }
    catch {
        // ignore and fall back
    }
    return defaultChoice;
}
