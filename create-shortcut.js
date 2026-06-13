import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const targetPath = join(__dirname, 'run-dev-visible.bat');
const localShortcutPath = join(__dirname, 'Trading Journal.lnk');

const createLnk = (path) => {
  const script = `
$WshShell = New-Object -ComObject WScript.Shell;
$Shortcut = $WshShell.CreateShortcut('${path.replace(/'/g, "''")}');
$Shortcut.TargetPath = '${targetPath.replace(/'/g, "''")}';
$Shortcut.WorkingDirectory = '${__dirname.replace(/'/g, "''")}';
$Shortcut.WindowStyle = 7;
$Shortcut.Save();
`;
  return new Promise((resolve) => {
    exec(`powershell -Command "${script.replace(/\n/g, ' ')}"`, (err) => {
      if (err) {
        console.error(`Failed to create shortcut at ${path}:`, err);
        resolve(false);
      } else {
        console.log(`Shortcut created successfully at ${path}`);
        resolve(true);
      }
    });
  });
};

const createDesktopLnk = () => {
  const script = `
$desktop = [Environment]::GetFolderPath('Desktop');
$path = Join-Path $desktop 'Trading Journal.lnk';
$WshShell = New-Object -ComObject WScript.Shell;
$Shortcut = $WshShell.CreateShortcut($path);
$Shortcut.TargetPath = '${targetPath.replace(/'/g, "''")}';
$Shortcut.WorkingDirectory = '${__dirname.replace(/'/g, "''")}';
$Shortcut.WindowStyle = 7;
$Shortcut.Save();
`;
  return new Promise((resolve) => {
    exec(`powershell -Command "${script.replace(/\n/g, ' ')}"`, (err) => {
      if (err) {
        console.error('Failed to create Desktop shortcut:', err);
        resolve(false);
      } else {
        console.log('Desktop shortcut created successfully!');
        resolve(true);
      }
    });
  });
};

async function main() {
  await createDesktopLnk();
  await createLnk(localShortcutPath);
  process.exit(0);
}

main();
