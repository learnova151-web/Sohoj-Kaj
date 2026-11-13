const { execFile } = require('child_process');
const { clipboard } = require('electron');

function pasteCommand() {
  switch (process.platform) {
    case 'darwin':
      return {
        file: 'osascript',
        args: ['-e', 'tell application "System Events" to keystroke "v" using command down']
      };
    case 'win32':
      return {
        file: 'powershell',
        args: ['-NoProfile', '-NonInteractive', '-Command', '$w = New-Object -ComObject WScript.Shell; $w.SendKeys(\'^v\')']
      };
    default:
      return { file: 'xdotool', args: ['key', '--clearmodifiers', 'ctrl+v'] };
  }
}

function run({ file, args }, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: timeoutMs, windowsHide: true }, err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function pasteText(text) {
  const previous = clipboard.readText();
  clipboard.writeText(text);
  try {
    await sleep(120);
    await run(pasteCommand());
    await sleep(600);
    clipboard.writeText(previous);
    return true;
  } catch (err) {
    clipboard.writeText(text);
    const hint =
      process.platform === 'darwin'
        ? 'Give Sohoj Kaj Accessibility permission (System Settings > Privacy & Security > Accessibility), then try again. The text is on your clipboard to paste manually.'
        : 'Could not type automatically. The text is on your clipboard to paste manually.';
    err.userHint = hint;
    throw err;
  }
}

module.exports = { pasteText };
