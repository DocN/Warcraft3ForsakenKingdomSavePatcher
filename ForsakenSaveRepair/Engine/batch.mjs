import fs, {openAsBlob} from 'node:fs';
import path from 'node:path';
import {unzipSync} from './vendor/fflate.mjs';
import {safePath} from './repair.mjs';
import {PROFILE} from './profiles.mjs';
import {renamedStem} from './save-rename.mjs';

const root = fs.realpathSync(process.argv[2]);
let response;
globalThis.self = {postMessage(message) {
  if (message.type === 'error') throw Error(message.message);
  if (message.type !== 'progress') response = message;
}};
await import('./worker.mjs');
async function request(type, options = {}) {
  response = null;
  await self.onmessage({data: {type, ...options}});
  return response;
}

const files = [];
async function scan(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.isSymbolicLink() || /_(?:upgraded|downgraded)_\d+\.\d+\.\d+\.\d+(?:\.w3z)?$/i.test(entry.name)) continue;
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir !== root || /^(Blizzard|FKManualSaves|CustomSaves)$/i.test(entry.name)) await scan(filename);
    } else if (entry.isFile() && /\.w3z$/i.test(entry.name)) {
      const blob = await openAsBlob(filename);
      blob.webkitRelativePath = path.relative(root, filename).split(path.sep).join('/');
      files.push(blob);
    }
  }
}

function install(bytes, main) {
  const items = Object.entries(unzipSync(bytes)).filter(([name]) => /\.w3z$/i.test(name));
  if (!items.some(([name]) => name === main)) throw Error('Converted checkpoint missing from bundle.');
  const stage = fs.mkdtempSync(path.join(root, '.patch-'));
  try {
    const pending = [];
    for (const [name, data] of items) {
      const parts = safePath(name).split('/');
      if (!parts.includes(path.basename(main, '.w3z')) && name !== main) throw Error('Unexpected output name: ' + name);
      let parent = root;
      for (const part of parts.slice(0, -1)) {
        parent = path.join(parent, part);
        if (!fs.existsSync(parent)) fs.mkdirSync(parent);
        if (fs.realpathSync(parent).toLowerCase() !== parent.toLowerCase()) throw Error('Redirected output directory: ' + parent);
      }
      const dest = path.join(root, ...parts);
      const tmp = path.join(stage, String(pending.length));
      if (fs.existsSync(dest)) {
        if (fs.lstatSync(dest).isSymbolicLink() || !fs.readFileSync(dest).equals(data)) throw Error('Existing output differs: ' + name);
        continue;
      }
      fs.writeFileSync(tmp, data);
      pending.push({tmp, dest});
    }
    pending.sort((a,b) => Number(path.basename(a.dest) === main) - Number(path.basename(b.dest) === main));
    for (const {tmp, dest} of pending) fs.linkSync(tmp, dest);
    return pending.length;
  } finally { fs.rmSync(stage, {recursive: true, force: true}); }
}

await scan(root);
const {checkpoints} = await request('listFolder', {files});
let created = 0, skipped = 0, failed = 0;
for (const item of checkpoints.filter(item => !item.path.includes('/'))) {
  try {
    const main = renamedStem(item.name, PROFILE) + '.w3z';
    console.log('Checking ' + item.path);
    const analysis = await request('checkpoint', {path: item.path});
    for (const missing of [...analysis.selection.missingFolders, ...analysis.selection.missingFiles])
      console.log('  Missing companion: ' + missing);
    if (analysis.rows.some(row => !['repair','current'].includes(row.status))) throw Error(analysis.rows.filter(row => !['repair','current'].includes(row.status)).map(row => row.path + ': ' + row.reason).join(', '));
    if (analysis.rows.every(row => row.status === 'current')) {
      console.log('  Already current.'); skipped++; continue;
    }
    const bundle = await request('export');
    const count = install(new Uint8Array(await bundle.blob.arrayBuffer()), main);
    if (count) { created++; console.log('  Installed ' + main + ' (' + count + ' files)'); }
    else { skipped++; console.log('  Matching converted files already exist.'); }
  } catch (error) { failed++; console.log('  Failed: ' + error.message); }
}
console.log('Finished. Converted: ' + created + '. Already current or installed: ' + skipped + '. Failed: ' + failed + '.');
if (failed) process.exitCode = 1;

