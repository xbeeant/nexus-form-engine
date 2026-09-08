import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { reactNodeFromString } from '../src/utils/react-node-from-string';

// ── extra 字符串 → ReactNode 渲染单元测试 ──────────────────────────────────
// 语义：extra 作为 string 进入渲染层时，若携带 HTML 标签则以真实节点渲染，
// 纯文本保持原样（避免被 HTML 解析导致特殊字符丢失）。

const rendered = (node: React.ReactNode): HTMLElement | null => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return container;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('reactNodeFromString（extra 字符串 → ReactNode）', () => {
  it('纯文本字符串保持原样（不经 HTML 解析）', () => {
    expect(reactNodeFromString('至少 8 位')).toBe('至少 8 位');
  });

  it('包含 HTML 标签时渲染为真实节点', () => {
    const container = rendered(
      reactNodeFromString(
        '提示：<a href="https://example.com">查看规则</a> 或 <b>联系管理员</b>',
      ),
    );
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://example.com');
    expect(container.querySelector('b')).not.toBeNull();
  });

  it('空串原样返回（历史脏数据兼容）', () => {
    expect(reactNodeFromString('')).toBe('');
  });

  it('危险标签/脚本被 DOMPurify 清洗（防 XSS）', () => {
    const container = rendered(
      reactNodeFromString(
        '<a href="https://ok.example">正常</a><script>alert(1)</script><img src=x onerror=alert(2)>',
      ),
    );
    // 脚本与事件注入被移除，普通标签保留
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img[onerror]')).toBeNull();
    expect(container.querySelector('a')).not.toBeNull();
  });
});