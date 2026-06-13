import fs from 'fs';
import path from 'path';

try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^\s*[\w.-]+\s*=\s*(.*)?\s*$/);
      const keyMatch = line.match(/^\s*([\w.-]+)\s*=/);
      if (match && keyMatch) {
        const key = keyMatch[1];
        let value = (match[1] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.warn('Failed to parse .env file manually:', e);
}
