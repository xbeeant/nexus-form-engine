import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PACKAGES = [
  { name: '@xbeeant/form-engine', dir: 'packages/core' },
  { name: '@xbeeant/form-engine-react', dir: 'packages/react' },
  { name: '@xbeeant/form-engine-ui', dir: 'packages/ui' },
  { name: '@xbeeant/form-engine-designer', dir: 'packages/designer' },
  { name: '@xbeeant/form-engine-devtools', dir: 'packages/devtools' },
];

const ROOT = resolve(__dirname, '..');

function readSummary(dir) {
  const p = join(ROOT, dir, 'coverage', 'coverage-summary.json');
  if (!existsSync(p)) {
    return null;
  }
  return JSON.parse(readFileSync(p, 'utf-8'));
}

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

const results = [];

for (const pkg of PACKAGES) {
  const summary = readSummary(pkg.dir);
  if (!summary) {
    results.push({ name: pkg.name, summary: null, files: [] });
    continue;
  }
  results.push({
    name: pkg.name,
    summary,
    files: summary.files.map((f) => ({
      name: f.path.split('/').pop() || f.path,
      statements: f.statements.pct,
      branches: f.branches.pct,
      functions: f.functions.pct,
      lines: f.lines.pct,
    })),
  });
}

const validPkgs = results.filter((r) => r.summary !== null);
const hasData = validPkgs.length > 0;

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
.arrows .top{background:#60a5fa}
.arrows .mid{background:#a78bfa}
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
td.name{color:#cbd5e1}
td.value{text-align:right;font-variant-numeric:tabular-nums;font-weight:500}
.no-data{color:#475569;font-style:italic;text-align:center;padding:1rem}
.timestamp{text-align:center;color:#475569;font-size:0.8rem;margin-top:1rem}
</style>
</head>
<body>
<h1>nexus-form-engine 测试覆盖率报告</h1>
<p class="subtitle">Generated: ${new Date().toLocaleString('zh-CN')}</p>

<div class="total-bar"><h2>汇总</h2>\n`;

if (hasData) {
  let totalS = 0,
    totalB = 0,
    totalF = 0,
    totalL = 0,
    n = 0;
  for (const r of validPkgs) {
    const s = r.summary;
    totalS += parseFloat(s.total.statements.pct);
    totalB += parseFloat(s.total.branches.pct);
    totalF += parseFloat(s.total.functions.pct);
    totalL += parseFloat(s.total.lines.pct);
    n++;
  }
  html += `<div class="grid">\n`;
  html += `<div class="stat-card"><div class="label">语句覆盖</div><div class="value" style="color:${pctColor(String(Math.round(totalS / n)))}">${Math.round(totalS / n)}%</div></div>\n`;
  html += `<div class="stat-card"><div class="label">分支覆盖</div><div class="value" style="color:${pctColor(String(Math.round(totalB / n)))}">${Math.round(totalB / n)}%</div></div>\n`;
  html += `<div class="stat-card"><div class="label">函数覆盖</div><div class="value" style="color:${pctColor(String(Math.round(totalF / n)))}">${Math.round(totalF / n)}%</div></div>\n`;
  html += `<div class="stat-card"><div class="label">行覆盖</div><div class="value" style="color:${pctColor(String(Math.round(totalL / n)))}">${Math.round(totalL / n)}%</div></div>\n`;
  html += `</div>\n`;
} else {
  html += `<p class="no-data">所有包均未运行测试，请先执行: bun run test:coverage</p>\n`;
}
html += `</div>\n`;

for (const r of results) {
  const { name, summary, files } = r;
  html += `<div class="package" id="pkg-${name.replace(/[^a-z0-9]/gi, '-')}" \n`;
  html += `<div class="package-header" onclick="this.parentElement.classList.toggle('collapsed')">\n`;
  html += `<h2>${name}</h2><div class="arrows"><span class="top"></span><span class="mid"></span></div></div>\n`;

  if (!summary) {
    html += `<p class="no-data">未找到 coverage-summary.json，请先运行测试</p>\n`;
    html += `</div>\n`;
    continue;
  }

  const stmtPct = parseInt(summary.total.statements.pct, 10);
  const branchPct = parseInt(summary.total.branches.pct, 10);
  const funcPct = parseInt(summary.total.functions.pct, 10);
  const linePct = parseInt(summary.total.lines.pct, 10);

  html += `<div class="pkg-stats">\n`;
  html += `<div class="pkg-stat"><div class="label">语句覆盖</div><div class="value" style="color:${pctColor(String(stmtPct))}">${stmtPct}%</div></div>\n`;
  html += `<div class="pkg-stat"><div class="label">分支覆盖</div><div class="value" style="color:${pctColor(String(branchPct))}">${branchPct}%</div></div>\n`;
  html += `<div class="pkg-stat"><div class="label">函数覆盖</div><div class="value" style="color:${pctColor(String(funcPct))}">${funcPct}%</div></div>\n`;
  html += `<div class="pkg-stat"><div class="label">行覆盖</div><div class="value" style="color:${pctColor(String(linePct))}">${linePct}%</div></div>\n`;
  html += `</div>\n`;

  html += `<div class="pbar">`;
  html += `<div style="width:${stmtPct}%;background:${pctColor(String(stmtPct))}"></div>`;
  html += `<div style="width:${branchPct}%;background:${pctColor(String(branchPct))}"></div>`;
  html += `<div style="width:${funcPct}%;background:${pctColor(String(funcPct))}"></div>`;
  html += `<div style="width:${linePct}%;background:${pctColor(String(linePct))}"></div>`;
  html += `</div><br>\n`;

  html += `<table><thead><tr><th style="width:50%">文件</th><th style="width:12.5%">语句</th><th style="width:12.5%">分支</th><th style="width:12.5%">函数</th><th style="width:12.5%">行</th></tr></thead><tbody>\n`;
  for (const f of files) {
    html += `<tr><td class="name">${f.name}</td>`;
    html += `<td class="value" style="color:${pctColor(f.statements)}">${f.statements}%</td>`;
    html += `<td class="value" style="color:${pctColor(f.branches)}">${f.branches}%</td>`;
    html += `<td class="value" style="color:${pctColor(f.functions)}">${f.functions}%</td>`;
    html += `<td class="value" style="color:${pctColor(f.lines)}">${f.lines}%</td></tr>\n`;
  }
  html += `</tbody></table></div>\n`;
}

html += `<p class="timestamp">nexus-form-engine test coverage report</p>\n</body></html>`;

writeFileSync(join(ROOT, 'test-report.html'), html, 'utf-8');
console.log('test-report.html generated');
