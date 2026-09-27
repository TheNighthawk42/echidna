const vscode = require('vscode');
const path = require('path');
const { execSync } = require('child_process');

// ---- Comment style per file extension ---------------------------------

const COMMENT_STYLES = {
  block: { open: '/*', close: '*/', ext: ['c', 'h', 'cpp', 'hpp', 'cc', 'js', 'ts', 'jsx', 'tsx', 'java', 'rs', 'go', 'css', 'scss'] },
  hash: { open: '#', close: '#', ext: ['py', 'sh', 'rb', 'yml', 'yaml', 'toml'] },
  html: { open: '<!--', close: '-->', ext: ['html', 'htm', 'xml'] }
};

function styleForFile(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  if (COMMENT_STYLES.block.ext.includes(ext)) return 'block';
  if (COMMENT_STYLES.hash.ext.includes(ext)) return 'hash';
  if (COMMENT_STYLES.html.ext.includes(ext)) return 'html';
  return 'block'; // default — Echidna is a C-first ecosystem
}

// ---- Formatting helpers -------------------------------------------------

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

function formatDate(d) {
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = pad2(d.getMinutes());
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${day}/${month}/${year}(${hours}:${minutes} ${ampm})`;
}

function getGitBranch(fileDir) {
  try {
    const out = execSync('git rev-parse --abbrev-ref HEAD', { cwd: fileDir, stdio: ['ignore', 'pipe', 'ignore'] });
    const branch = out.toString().trim();
    return branch || 'none';
  } catch (e) {
    return 'none';
  }
}

function getProjectName(fileDir) {
  const configured = vscode.workspace.getConfiguration('echidnaHeader').get('projectName');
  if (configured && configured.trim().length > 0) return configured.trim();
  const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  return folder ? path.basename(folder.uri.fsPath) : path.basename(fileDir);
}

// ---- Header building ------------------------------------------------------

function buildLine(commentStyle, content, width) {
  if (commentStyle === 'hash') {
    return `# ${content}`.padEnd(width - 1) + '#';
  }
  if (commentStyle === 'html') {
    return `<!-- ${content} -->`;
  }
  const inner = width - 6; // "/* " + " */"
  const text = content.length > inner ? content.slice(0, inner) : content.padEnd(inner);
  return `/* ${text} */`;
}

function buildBorder(commentStyle, width) {
  if (commentStyle === 'hash') return '#'.repeat(width);
  if (commentStyle === 'html') return `<!-- ${'-'.repeat(Math.max(width - 9, 0))} -->`;
  return '/* ' + '*'.repeat(width - 6) + ' */';
}

function buildHeader(filePath, createdAt, updatedAt) {
  const config = vscode.workspace.getConfiguration('echidnaHeader');
  const width = config.get('width') || 100;
  const login = config.get('login') || 'the_nighthawk';
  const fileDir = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const dirName = path.basename(fileDir);
  const branch = getGitBranch(fileDir);
  const projectName = getProjectName(fileDir);
  const style = styleForFile(fileName);

  const created = formatDate(createdAt);
  const updated = formatDate(updatedAt);

  const lines = [
    buildBorder(style, width),
    buildLine(style, `PROJECT NAME: ${projectName};`, width),
    buildLine(style, `BRANCH: ${branch}`, width),
    buildLine(style, `LOGIN: ${login}`, width),
    buildLine(style, `DIRECTORY_NAME(${dirName})   CREATED: ${created}   UPDATED: ${updated}`, width),
    buildLine(style, `FILE_NAME(${fileName})   CREATED: ${created}   UPDATED: ${updated}`, width),
    buildLine(style, '', width),
    buildBorder(style, width)
  ];

  return lines.join('\n') + '\n\n';
}

// A header is recognized by its DIRECTORY_NAME( marker, wherever it sits in the comment style.
const HEADER_MARKER = /DIRECTORY_NAME\(/;
const DATE_REGEX = /\d{1,2}\/\d{1,2}\/\d{4}\([^)]*\)/g;
const NAME_REGEX = /(DIRECTORY_NAME|FILE_NAME)\(([^)]*)\)/;

function hasHeader(text) {
  return HEADER_MARKER.test(text.slice(0, 2000));
}

function detectStyle(borderLine) {
  const trimmed = borderLine.trim();
  if (trimmed.startsWith('#')) return 'hash';
  if (trimmed.startsWith('<!--')) return 'html';
  return 'block';
}

// Rebuilds the DIRECTORY_NAME and FILE_NAME lines from scratch, keeping their
// original CREATED date and name, refreshing only UPDATED — then re-wraps the
// whole line with buildLine() so alignment always matches the border exactly,
// regardless of how much the date text changed in length.
function refreshTimestamps(text, updatedAt) {
  const lines = text.split('\n');
  const dirIdx = lines.findIndex(l => l.includes('DIRECTORY_NAME('));
  if (dirIdx === -1) return text;

  const fileIdx = lines.findIndex((l, i) => i > dirIdx && l.includes('FILE_NAME('));
  if (fileIdx === -1) return text;

  const borderIdx = dirIdx - 4; // border sits 4 lines above DIRECTORY_NAME, per our fixed template
  const borderLine = lines[borderIdx] || lines[dirIdx];
  const style = detectStyle(borderLine);
  const width = borderLine.length > 10 ? borderLine.length : 100;

  const updated = formatDate(updatedAt);

  for (const idx of [dirIdx, fileIdx]) {
    const line = lines[idx];
    const nameMatch = line.match(NAME_REGEX);
    const dates = line.match(DATE_REGEX);
    if (!nameMatch || !dates || dates.length === 0) continue;

    const label = nameMatch[1];
    const value = nameMatch[2];
    const created = dates[0];
    const content = `${label}(${value})   CREATED: ${created}   UPDATED: ${updated}`;
    lines[idx] = buildLine(style, content, width);
  }

  return lines.join('\n');
}

// ---- Commands & activation -------------------------------------------------

function activate(context) {
  // Manual insert
  context.subscriptions.push(
    vscode.commands.registerCommand('echidnaHeader.insertHeader', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const doc = editor.document;
      if (hasHeader(doc.getText())) {
        vscode.window.showInformationMessage('Echidna Header: this file already has a header.');
        return;
      }
      const now = new Date();
      const header = buildHeader(doc.uri.fsPath, now, now);
      await editor.edit(editBuilder => editBuilder.insert(new vscode.Position(0, 0), header));
    })
  );

  // Manual update
  context.subscriptions.push(
    vscode.commands.registerCommand('echidnaHeader.updateHeader', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const doc = editor.document;
      const text = doc.getText();
      if (!hasHeader(text)) {
        vscode.window.showInformationMessage('Echidna Header: no header found to update.');
        return;
      }
      const updatedText = refreshTimestamps(text, new Date());
      const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(text.length));
      await editor.edit(editBuilder => editBuilder.replace(fullRange, updatedText));
    })
  );

  // Auto-insert on new file creation
  context.subscriptions.push(
    vscode.workspace.onDidCreateFiles(async (event) => {
      const config = vscode.workspace.getConfiguration('echidnaHeader');
      if (!config.get('autoInsertOnCreate')) return;

      for (const fileUri of event.files) {
        try {
          const stat = await vscode.workspace.fs.stat(fileUri);
          // skip directories
          if (stat.type === vscode.FileType.Directory) continue;

          const doc = await vscode.workspace.openTextDocument(fileUri);
          if (hasHeader(doc.getText())) continue;

          const now = new Date();
          const header = buildHeader(fileUri.fsPath, now, now);
          const edit = new vscode.WorkspaceEdit();
          edit.insert(fileUri, new vscode.Position(0, 0), header);
          await vscode.workspace.applyEdit(edit);
          await doc.save();
        } catch (e) {
          // Non-text or unreadable file — skip silently
        }
      }
    })
  );

  // Auto-update "updated" timestamp on save
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((event) => {
      const config = vscode.workspace.getConfiguration('echidnaHeader');
      if (!config.get('autoUpdateOnSave')) return;

      const doc = event.document;
      const text = doc.getText();
      if (!hasHeader(text)) return;

      const updatedText = refreshTimestamps(text, new Date());
      if (updatedText === text) return;

      const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(text.length));
      event.waitUntil(Promise.resolve([vscode.TextEdit.replace(fullRange, updatedText)]));
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
