import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  collapsePanelLayout,
  stepLayout,
  tabPaneLayout,
  voidLayout,
} from '../src/layouts/pass-through';

describe('voidLayout', () => {
  it('透传 children', () => {
    const { container } = render(
      voidLayout({
        children: <div>透传内容</div>,
      }),
    );
    expect(container.textContent).toContain('透传内容');
  });

  it('空 children 不崩溃', () => {
    const { container } = render(voidLayout({}));
    expect(container.innerHTML).toBe('');
  });
});

describe('tabPaneLayout', () => {
  it('透传 children', () => {
    const { container } = render(
      tabPaneLayout({
        children: <div>TabPane 内容</div>,
      }),
    );
    expect(container.textContent).toContain('TabPane 内容');
  });

  it('空 children 不崩溃', () => {
    const { container } = render(tabPaneLayout({}));
    expect(container.innerHTML).toBe('');
  });
});

describe('collapsePanelLayout', () => {
  it('透传 children', () => {
    const { container } = render(
      collapsePanelLayout({
        children: <div>CollapsePanel 内容</div>,
      }),
    );
    expect(container.textContent).toContain('CollapsePanel 内容');
  });

  it('空 children 不崩溃', () => {
    const { container } = render(collapsePanelLayout({}));
    expect(container.innerHTML).toBe('');
  });
});

describe('stepLayout', () => {
  it('透传 children', () => {
    const { container } = render(
      stepLayout({
        children: <div>Step 内容</div>,
      }),
    );
    expect(container.textContent).toContain('Step 内容');
  });

  it('空 children 不崩溃', () => {
    const { container } = render(stepLayout({}));
    expect(container.innerHTML).toBe('');
  });
});
