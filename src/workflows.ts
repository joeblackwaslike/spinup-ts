export const BUN_VERSION_FILE = '.bun-version';

const SETUP_NODE_STEP = /^([ \t]*)- (?:name: [^\n]*\n[ \t]*)?uses: actions\/setup-node/gm;
const SETUP_PNPM_STEP = /^([ \t]*)- (?:name: [^\n]*\n[ \t]*)?uses: pnpm\/action-setup/gm;
const JOB_KEY = /^ {2}[\w.-]+:[ \t]*$/gm;
const MIN_NODE_FOR_PNPM = '22';

function jobRange(text: string, index: number): [number, number] {
  let start = 0;
  let end = text.length;
  for (const match of text.matchAll(JOB_KEY)) {
    if (match.index <= index) start = match.index;
    else {
      end = match.index;
      break;
    }
  }
  return [start, end];
}

function insertBeforeEach(
  text: string,
  pattern: RegExp,
  marker: string,
  step: (indent: string) => string,
): string {
  let result = text;
  let shift = 0;
  const handled = new Set<number>();
  for (const match of text.matchAll(pattern)) {
    const [start, end] = jobRange(text, match.index);
    if (handled.has(start)) continue;
    handled.add(start);
    if (result.slice(start + shift, end + shift).includes(marker)) continue;
    const insertion = step(match[1] ?? '');
    const at = match.index + shift;
    result = result.slice(0, at) + insertion + result.slice(at);
    shift += insertion.length;
  }
  return result;
}

function dropActionSetupVersion(text: string): string {
  const withBlock =
    /(uses: pnpm\/action-setup@[^\n]*\n)([ \t]*)with:\n((?:[ \t]+[\w-]+: [^\n]*\n)+)/g;
  return text.replaceAll(withBlock, (_all, uses: string, indent: string, body: string) => {
    const kept = body.split('\n').filter((line) => line.length > 0 && !/^\s*version:/.test(line));
    return kept.length === 0 ? uses : `${uses}${indent}with:\n${kept.join('\n')}\n`;
  });
}

function raiseNodeForPnpm(text: string): string {
  return text.replaceAll(
    /^( *node-version: )(["']?)(?:1\d|20)(?:\.[\dx]+)*\2[ \t]*$/gm,
    (_all, key: string, quote: string) => `${key}${quote}${MIN_NODE_FOR_PNPM}${quote}`,
  );
}

export function addSetupPnpm(text: string): string {
  if (!/\bpnpm\b/.test(text)) return text;
  const withSetup = insertBeforeEach(
    text,
    SETUP_NODE_STEP,
    'pnpm/action-setup',
    (indent) => `${indent}- uses: pnpm/action-setup@v4\n\n`,
  );
  return raiseNodeForPnpm(
    dropActionSetupVersion(withSetup.replaceAll(/^( *cache: )(["']?)npm\2[ \t]*$/gm, '$1$2pnpm$2')),
  );
}

export function addSetupBun(text: string): string {
  return insertBeforeEach(
    text,
    SETUP_PNPM_STEP,
    'oven-sh/setup-bun',
    (indent) =>
      `${indent}- uses: oven-sh/setup-bun@v2\n${indent}  with:\n${indent}    bun-version-file: ${BUN_VERSION_FILE}\n\n`,
  );
}
