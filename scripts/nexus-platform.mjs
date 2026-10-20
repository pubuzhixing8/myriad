import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const defaultNxp = fileURLToPath(
  new URL('../../../../playground/nexus-platform/bin/nxp', import.meta.url),
);
const nxp = process.env.NXP_BIN || defaultNxp;

if (!existsSync(nxp)) {
  console.error(`找不到 Nexus 多平台工具：${nxp}`);
  console.error('请设置 NXP_BIN 为 nxp 可执行文件的绝对路径。');
  process.exit(1);
}

const result = spawnSync(nxp, process.argv.slice(2), {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
