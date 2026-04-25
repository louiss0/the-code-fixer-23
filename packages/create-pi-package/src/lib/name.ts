const kebabCasePattern = /^[a-z][a-z0-9-]*$/;

export function isKebabCaseName(value: string) {
  return kebabCasePattern.test(value);
}

export function getScopedPackageName(scope: string, name: string) {
  return `${scope}/${name}`;
}
