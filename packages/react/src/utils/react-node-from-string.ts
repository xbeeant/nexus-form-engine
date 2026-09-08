import DOMPurify from 'dompurify';
import type { ReactNode } from 'react';
import { createElement } from 'react';

// 简单 HTML 标签识别：匹配形如 <xxx ...>...</xxx> 或自闭合 <xxx .../>
const HTML_TAG_PATTERN = /<\/?[a-zA-Z][^>]*>/;

// Hook 只注册一次
let hookRegistered = false;

function ensureHook() {
  if (hookRegistered) {
    return;
  }
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  hookRegistered = true;
}

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'a',
    'ul',
    'ol',
    'li',
    'blockquote',
    'code',
    'pre',
  ],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
};

export function pureHtmlString(value: string): string {
  ensureHook();
  return DOMPurify.sanitize(value, PURIFY_CONFIG);
}

/**
 * 将字符串渲染为 ReactNode：
 * - 字符串包含 HTML 标签时，经 DOMPurify 清洗后通过 dangerouslySetInnerHTML
 *   渲染为真实节点（防 XSS）
 * - 纯文本字符串原样渲染（避免特殊字符被 HTML 解析）
 * @param value 待渲染字符串（可能是 HTML 标签）
 * @returns 渲染后的 ReactNode
 */
export function reactNodeFromString(value: string): ReactNode {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }
  if (HTML_TAG_PATTERN.test(value)) {
    const sanitized = pureHtmlString(value);
    return createElement('span', {
      // biome-ignore lint/security/noDangerouslySetInnerHtml: 已用 DOMPurify 清洗
      dangerouslySetInnerHTML: { __html: sanitized },
    });
  }
  return value;
}
