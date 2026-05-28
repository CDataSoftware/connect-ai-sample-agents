#!/usr/bin/env node
import { intro, outro, select, confirm, isCancel, cancel, note, log } from '@clack/prompts';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative, basename } from 'node:path';
import { existsSync } from 'node:fs';
import { cp, readFile, writeFile, readdir, rename } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');

const HELP = `
Usage: npx @cdatasoftware/create-agent [template] [options]

Scaffolds a CData agent template into the current directory.

Arguments:
  template            Template id (run with no args to pick interactively)

Options:
  -h, --help          Show this help
  -l, --list          List available templates and exit
  -f, --force         Overwrite existing files without prompting
  -p, --python        Pick the Python variant of the chosen template
  -t, --typescript    Pick the TypeScript variant of the chosen template

If a template has both Python and TypeScript variants and no flag is given,
you'll be prompted to choose.
`;

function parseArgs(argv) {
  const args = {
    template: undefined,
    force: false,
    list: false,
    help: false,
    variant: undefined,
  };
  for (const a of argv) {
    if (a === '-h' || a === '--help') args.help = true;
    else if (a === '-l' || a === '--list') args.list = true;
    else if (a === '-f' || a === '--force') args.force = true;
    else if (a === '-p' || a === '--python') args.variant = 'python';
    else if (a === '-t' || a === '--typescript' || a === '--ts') args.variant = 'typescript';
    else if (!a.startsWith('-') && !args.template) args.template = a;
  }
  return args;
}

function hasVariants(template) {
  return template.variants && typeof template.variants === 'object';
}

async function resolveVariant(template, requested) {
  if (!hasVariants(template)) {
    if (requested) {
      log.warn(`Template "${template.label}" has no variants — ignoring --${requested}.`);
    }
    return template;
  }
  const variantIds = Object.keys(template.variants);

  if (requested) {
    if (!template.variants[requested]) {
      log.error(
        `Template "${template.label}" has no "${requested}" variant. Available: ${variantIds.join(', ')}`,
      );
      process.exit(1);
    }
    return template.variants[requested];
  }

  const picked = await select({
    message: `Pick a language for ${template.label}`,
    options: variantIds.map((id) => ({
      value: id,
      label: template.variants[id].label ?? id,
    })),
  });
  if (isCancel(picked)) {
    cancel('Cancelled');
    process.exit(0);
  }
  return template.variants[picked];
}

async function loadRegistry() {
  const raw = await readFile(join(packageRoot, 'templates.json'), 'utf-8');
  return JSON.parse(raw);
}

async function listTemplateFiles(rootDir, ignore) {
  const files = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignore.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) files.push(relative(rootDir, full));
    }
  }
  await walk(rootDir);
  return files;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(HELP);
    return;
  }

  const registry = await loadRegistry();
  const templateIds = Object.keys(registry.templates);

  if (args.list) {
    for (const id of templateIds) {
      const t = registry.templates[id];
      const suffix = hasVariants(t) ? ` [variants: ${Object.keys(t.variants).join(', ')}]` : '';
      process.stdout.write(`  ${id.padEnd(12)} ${t.label}${suffix}\n`);
    }
    return;
  }

  intro('@cdatasoftware/create-agent');

  let templateId = args.template;
  if (templateId && !registry.templates[templateId]) {
    log.error(`Unknown template "${templateId}". Available: ${templateIds.join(', ')}`);
    process.exit(1);
  }

  if (!templateId) {
    const picked = await select({
      message: 'Pick a template',
      options: templateIds.map((id) => ({
        value: id,
        label: registry.templates[id].label,
        hint: registry.templates[id].description,
      })),
    });
    if (isCancel(picked)) {
      cancel('Cancelled');
      process.exit(0);
    }
    templateId = picked;
  }

  const template = registry.templates[templateId];
  const resolved = await resolveVariant(template, args.variant);
  const displayLabel = hasVariants(template)
    ? `${template.label} — ${resolved.label}`
    : template.label;
  const sourceDir = resolve(packageRoot, resolved.source);
  const targetDir = process.cwd();
  const ignore = new Set(registry.copyIgnore ?? []);

  if (!existsSync(sourceDir)) {
    log.error(`Template source missing on disk: ${resolved.source}`);
    process.exit(1);
  }

  const templateFiles = await listTemplateFiles(sourceDir, ignore);
  const conflicts = templateFiles.filter((f) => existsSync(join(targetDir, f)));

  if (conflicts.length > 0 && !args.force) {
    log.warn(`The following files already exist in ${basename(targetDir)}/:`);
    for (const f of conflicts) log.message(`  ${f}`);
    const ok = await confirm({
      message: `Overwrite ${conflicts.length} file(s)?`,
      initialValue: false,
    });
    if (isCancel(ok) || !ok) {
      cancel('Aborted — no files written.');
      process.exit(0);
    }
  }

  await cp(sourceDir, targetDir, {
    recursive: true,
    force: true,
    filter: (src) => !ignore.has(basename(src)),
  });

  await restoreDotfiles(targetDir);
  await patchPackageJson(targetDir);

  const nextSteps = (resolved.next ?? template.next ?? []).join('\n');
  if (nextSteps) note(nextSteps, 'Next steps');

  outro(`Scaffolded ${displayLabel} into ${basename(targetDir)}/`);
}

const DOTFILE_RENAMES = {
  _gitignore: '.gitignore',
  _npmrc: '.npmrc',
};

async function restoreDotfiles(targetDir) {
  for (const [from, to] of Object.entries(DOTFILE_RENAMES)) {
    const src = join(targetDir, from);
    if (existsSync(src)) await rename(src, join(targetDir, to));
  }
}

async function patchPackageJson(targetDir) {
  const pkgPath = join(targetDir, 'package.json');
  if (!existsSync(pkgPath)) return;
  try {
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    pkg.name = basename(targetDir).toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  } catch {
    // template package.json wasn't valid JSON — leave it alone
  }
}

main().catch((err) => {
  process.stderr.write(`\n${err.stack ?? err}\n`);
  process.exit(1);
});
