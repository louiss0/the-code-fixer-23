import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline/promises';

export function isInteractiveSession() {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

export async function selectChoice<T extends string>(options: {
  choices: readonly T[];
  defaultChoice: T;
  label: string;
}) {
  const promptLabel = `${options.label} (${options.choices.join('/')}) [${
    options.defaultChoice
  }]: `;
  const reader = readline.createInterface({ input, output });

  try {
    const answer = (await reader.question(promptLabel)).trim();

    if (answer.length === 0) {
      return options.defaultChoice;
    }

    if (options.choices.includes(answer as T)) {
      return answer as T;
    }

    throw new Error(`Invalid choice for ${options.label}: ${answer}`);
  } finally {
    reader.close();
  }
}
