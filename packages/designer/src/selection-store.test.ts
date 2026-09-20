import { describe, expect, it, vi } from 'vitest';
import { createSelectionStore, toPathKey } from './selection-store';

describe('SelectionStore（选中节点外部存储）', () => {
  it('默认未选中；set 更新 path/pathKey 并通知订阅者', () => {
    const store = createSelectionStore();
    expect(store.getPath()).toBeNull();
    expect(store.getPathKey()).toBeNull();

    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(['user', 'name']);
    expect(store.getPath()).toEqual(['user', 'name']);
    expect(store.getPathKey()).toBe('["user","name"]');
    expect(store.isSelected('["user","name"]')).toBe(true);
    expect(store.isSelected('["user"]')).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);

    // 退订后不再收到通知
    unsubscribe();
    store.set(['user', 'age']);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('set 相同选中（含重复 null）不重复通知', () => {
    const store = createSelectionStore();
    store.set(['a']);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set(['a']);
    expect(listener).not.toHaveBeenCalled();

    store.set(null);
    expect(listener).toHaveBeenCalledTimes(1);
    store.set(null);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('取消选中后所有 pathKey 均未命中', () => {
    const store = createSelectionStore();
    store.set(['a', 'b']);
    store.set(null);
    expect(store.getPath()).toBeNull();
    expect(store.getPathKey()).toBeNull();
    expect(store.isSelected('["a","b"]')).toBe(false);
  });

  it('选中切换时仅新旧路径命中，其余未命中', () => {
    const store = createSelectionStore();
    store.set(['a']);
    store.set(['b']);
    expect(store.isSelected('["a"]')).toBe(false);
    expect(store.isSelected('["b"]')).toBe(true);
    expect(store.isSelected('["b","c"]')).toBe(false);
  });

  it('getPath 返回引用稳定：未变化时两次调用为同一引用', () => {
    const store = createSelectionStore();
    store.set(['a']);
    expect(store.getPath()).toBe(store.getPath());
    expect(store.getPathKey()).toBe(store.getPathKey());
  });

  it('toPathKey 对任意 key 内容安全（中文/引号/点号/斜杠）', () => {
    expect(toPathKey(['用户', 'a"b.c', 'x/y'])).toBe(
      '["用户","a\\"b.c","x/y"]',
    );
    const store = createSelectionStore();
    store.set(['用户', 'a"b.c']);
    expect(store.isSelected(toPathKey(['用户', 'a"b.c']))).toBe(true);
    expect(store.isSelected('["用户","a\\"b.c"]')).toBe(true);
  });
});
