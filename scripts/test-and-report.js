import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const packages = [
  { name: '@xbeeant/form-engine', dir: 'packages/core' },
  { name: '@xbeeant/form-engine-react', dir: 'packages/react' },
  { name: '@xbeeant/form-engine-ui', dir: 'packages/ui' },
  { name: '@xbeeant/form-engine-designer', dir: 'packages/designer' },
  { name: '@xbeeant/form-engine-devtools', dir: 'packages/devtools' },
];

const ROOT = process.cwd();

console.log('\n========== Running tests for all packages ==========\n');

const results = [];

for (const pkg of packages) {
  const pkgDir = join(ROOT, pkg.dir);
  try {
    console.log(`\n📦 ${pkg.name}`);
    const output = execSync(`bunx vitest run --coverage`, {
      cwd: pkgDir,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    console.log(output);
    results.push({ name: pkg.name, status: 'passed', pkgDir: pkg.dir });
  } catch (_err) {
    console.log(`\n❌ ${pkg.name} (exited with non-zero, continuing...)`);
    results.push({ name: pkg.name, status: 'failed', pkgDir: pkg.dir });
  }
}

// ── 生成汇总报告 ──
console.log('\n========== Generating coverage report ==========\n');

function pctColor(pct) {
  const n = parseFloat(pct);
  if (n >= 90) {
    return '#22c55e';
  }
  if (n >= 70) {
    return '#84cc16';
  }
  if (n >= 50) {
    return '#eab308';
  }
  return '#ef4444';
}

function readSummary(dir) {
  const p = join(ROOT, dir, 'coverage', 'coverage-summary.json');
  if (!existsSync(p)) {
    return null;
  }
  return JSON.parse(readFileSync(p, 'utf-8'));
}

const validPkgs = [];
for (const pkg of packages) {
  const summary = readSummary(pkg.dir);
  if (summary) {
    validPkgs.push({ ...pkg, summary });
  }
}

let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>测试覆盖率报告 - nexus-form-engine</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;padding:2rem}
h1{text-align:center;margin-bottom:0.5rem;color:#f8fafc;font-size:1.8rem}
.subtitle{text-align:center;color:#94a3b8;margin-bottom:2rem;font-size:0.9rem}
.total-bar{background:#1e293b;border-radius:12px;padding:1.5rem;margin-bottom:2rem}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
.stat-card{background:#0f172a;border-radius:8px;padding:1rem;text-align:center}
.stat-card .label{font-size:0.8rem;color:#64748b;margin-bottom:0.3rem}
.stat-card .value{font-size:1.5rem;font-weight:700}
.package{background:#1e293b;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem;border:1px solid #334155}
.package-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;cursor:pointer;user-select:none}
.package-header h2{font-size:1.1rem;color:#f1f5f9}
.arrows{display:flex;gap:0.5rem}
.arrows span{width:48px;height:6px;border-radius:3px;display:block}
.arrows .top{background:#60a5fa}.arrows .mid{background:#a78bfa}
.package.collapsed .arrows .mid{transform:rotate(90deg);transform-origin:center}
.package.collapsed .file-table{display:none}
.pbar{width:100%;height:8px;background:#334155;border-radius:4px;overflow:hidden;display:flex}
.pbar>div{height:100%}
.pkg-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1rem}
.pkg-stat{text-align:center}
.pkg-stat .label{font-size:0.75rem;color:#64748b}
.pkg-stat .value{font-size:1rem;font-weight:600;margin-top:0.2rem}
table{width:100%;border-collapse:collapse;font-size:0.85rem}
th{text-align:left;color:#64748b;font-weight:500;padding:0.5rem 0.75rem;border-bottom:1px solid #334155}
td{padding:0.5rem 0.75rem;border-bottom:1px solid #1e293b}
td.name{color:#cbd5e1}td.value{text-align:right;font-variant-numeric:tabular-nums;font-weight:500}
.no-data{color:#475569;font-style:italic;text-align:center;padding:1rem}
.timestamp{text-align:center;color:#475569;font-size:0.8rem;margin-top:1rem}
</style>
</head>
<body>
<h1>nexus-form-engine 测试覆盖率报告</h1>
<p class="subtitle">Generated: ${new Date().toLocaleString('zh-CN')}</p>
<div class="total-bar"><h2>汇总</h2>`;

if (validPkgs.length > 0) {
  let totalS = 0,
    totalB = 0,
    totalF = 0,
    totalL = 0,
    n = validPkgs.length;
  for (const p of validPkgs) {
    const s = p.summary;
    totalS += parseFloat(s.total.statements.pct);
    totalB += parseFloat(s.total.branches.pct);
    totalF += parseFloat(s.total.functions.pct);
    totalL += parseFloat(s.total.lines.pct);
  }
  html += `<div class="grid">
<div class="stat-card"><div class="label">语句覆盖</div><div class="value" style="color:${pctColor(String(Math.round(totalS / n)))}">${Math.round(totalS / n)}%</div></div>
<div class="stat-card"><div class="label">分支覆盖</div><div class="value" style="color:${pctColor(String(Math.round(totalB / n)))}">${Math.round(totalB / n)}%</div></div>
<div class="stat-card"><div class="label">函数覆盖</div><div class="value" style="color:${pctColor(String(Math.round(totalF / n)))}">${Math.round(totalF / n)}%</div></div>
<div class="stat-card"><div class="label">行覆盖</div><div class="value" style="color:${pctColor(String(Math.round(totalL / n)))}">${Math.round(totalL / n)}%</div></div>
</div>`;
} else {
  html += `<p class="no-data">所有包均未运行测试</p>`;
}
html += `</div>\n`;

const allResults = [...results]; // include failed ones too
for (const r of allResults) {
  const summary = readSummary(r.pkgDir);
  html += `<div class="package">
<div class="package-header"><h2>${r.name} ${r.status === 'failed' && !summary ? '(no coverage data)' : ''}</h2></div>`;

  if (!summary) {
    html += `<p class="no-data">未找到 coverage-summary.json</p></div>\n`;
    continue;
  }

  const sp = parseInt(summary.total.statements.pct, 10);
  const bp = parseInt(summary.total.branches.pct, 10);
  const fp = parseInt(summary.total.functions.pct, 10);
  const lp = parseInt(summary.total.lines.pct, 10);

  html += `<div class="pkg-stats">
<div class="pkg-stat"><div class="label">语句覆盖</div><div class="value" style="color:${pctColor(String(sp))}">${sp}%</div></div>
<div class="pkg-stat"><div class="label">分支覆盖</div><div class="value" style="color:${pctColor(String(bp))}">${bp}%</div></div>
<div class="pkg-stat"><div class="label">函数覆盖</div><div class="value" style="color:${pctColor(String(fp))}">${fp}%</div></div>
<div class="pkg-stat"><div class="label">行覆盖</div><div class="value" style="color:${pctColor(String(lp))}">${lp}%</div></div>
</div>
<div class="pbar">
<div style="width:${sp}%;background:${pctColor(String(sp))}"></div>
<div style="width:${bp}%;background:${pctColor(String(bp))}"></div>
<div style="width:${fp}%;background:${pctColor(String(fp))}"></div>
<div style="width:${lp}%;background:${pctColor(String(lp))}"></div>
</div><br>
<table><thead><tr><th style="width:50%">文件</th><th style="width:12.5%">语句</th><th style="width:12.5%">分支</th><th style="width:12.5%">函数</th><th style="width:12.5%">行</th></tr></thead><tbody>`;

  const files = summary.files || [];
  for (const f of files) {
    const name = f.path.split('/').pop() || f.path;
    html += `<tr><td class="name">${name}</td>
<td class="value" style="color:${pctColor(f.statements.pct)}">${f.statements.pct}%</td>
<td class="value" style="color:${pctColor(f.branches.pct)}">${f.branches.pct}%</td>
<td class="value" style="color:${pctColor(f.functions.pct)}">${f.functions.pct}%</td>
<td class="value" style="color:${pctColor(f.lines.pct)}">${f.lines.pct}%</td></tr>`;
  }
  html += `</tbody></table></div>\n`;
}

html += `<p class="timestamp">nexus-form-engine test coverage report</p></body></html>`;

import { writeFileSync } from 'node:fs';

const outPath = join(ROOT, 'test-report.html');
writeFileSync(outPath, html, 'utf-8');
console.log(`✅ Report generated: test-report.html\n`);

const passed = allResults.filter((r) => r.status === 'passed').length;
const failed = allResults.filter((r) => r.status === 'failed').length;
console.log(`\n========== Summary ==========\n`);
console.log(`Total: ${allResults.length} packages`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Report: test-report.html\n`);

if (failed > 0) {
  process.exit(1);
}
