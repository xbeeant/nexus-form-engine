import { describe, expect, it } from 'vitest';

import type { NexusSchema } from '@xbeeant/form-engine';
import { COALESCE_MS, HISTORY_LIMIT, SchemaHistory } from './history';

const schema = (props: Record<string, unknown>): NexusSchema =>
  ({
    type: 'object',
    displayType: 'row',
    properties: props,
  }) as NexusSchema;

const base = schema({});

describe('SchemaHistory（撤销/重做历史栈）', () => {
  it('push 记录变更前快照，undo 恢复并压入 future，redo 还原', () => {
    const history = new SchemaHistory();
    const s1 = schema({ a: { type: 'string' } });
    const s2 = schema({ a: { type: 'string' }, b: { type: 'number' } });

    history.push(base, 'edit', null, 1000);
    history.push(s1, 'edit', null, 2000);

    expect(history.canUndo).toBe(true);
    expect(history.undo(s2)).toEqual(s1);
    expect(history.canRedo).toBe(true);
    expect(history.redo()).toEqual(s2);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it('无可撤销/重做时返回 null', () => {
    const history = new SchemaHistory();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undo(base)).toBeNull();
    expect(history.redo()).toBeNull();
  });

  it('同路径 + 窗口内连续 edit 合并为一条（保留最早快照）', () => {
    const history = new SchemaHistory();
    const s1 = schema({ a: { type: 'string', title: 'A' } });
    const s2 = schema({ a: { type: 'string', title: 'AB' } });
    const s3 = schema({ a: { type: 'string', title: 'ABC' } });

    history.push(base, 'edit', 'a', 1000);
    history.push(s1, 'edit', 'a', 1100); // 合并
    history.push(s2, 'edit', 'a', 1200); // 合并

    expect(history.size).toBe(1);
    // 一步撤销回到最早快照（base）
    expect(history.undo(s3)).toEqual(base);
    expect(history.canUndo).toBe(false);
  });

  it('超窗口 / 不同路径 / 非 edit 类型不合并', () => {
    const history = new SchemaHistory();
    const s1 = schema({ a: { type: 'string' } });

    history.push(base, 'edit', 'a', 1000);
    history.push(s1, 'edit', 'a', 1000 + COALESCE_MS + 1); // 超窗口
    expect(history.size).toBe(2);

    const history2 = new SchemaHistory();
    history2.push(base, 'edit', 'a', 1000);
    history2.push(s1, 'edit', 'b', 1100); // 不同路径
    expect(history2.size).toBe(2);

    const history3 = new SchemaHistory();
    history3.push(base, 'replace', null, 1000);
    history3.push(s1, 'replace', null, 1100); // replace 不合并
    expect(history3.size).toBe(2);
  });

  it('编辑时清空 future（撤销后产生新变更则无法重做）', () => {
    const history = new SchemaHistory();
    const s1 = schema({ a: { type: 'string' } });
    const s2 = schema({ a: { type: 'string' }, b: { type: 'number' } });

    history.push(base, 'edit', null, 1000);
    history.push(s1, 'edit', null, 2000);
    history.undo(s2); // future: [s2]
    expect(history.canRedo).toBe(true);

    history.push(s2, 'replace', null, 3000); // 新变更
    expect(history.canRedo).toBe(false);
    expect(history.redo()).toBeNull();
  });

  it('容量上限 HISTORY_LIMIT，超出丢弃最旧记录', () => {
    const history = new SchemaHistory();
    let current = base;
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      const next = schema({ [`f${i}`]: { type: 'string' } });
      history.push(current, 'replace', null, i * 100);
      current = next;
    }
    expect(history.size).toBe(HISTORY_LIMIT);

    // 最旧的 10 条被丢弃：回退 50 步后无可撤销
    let undone = 0;
    while (history.undo(current) !== null) {
      undone++;
    }
    expect(undone).toBe(HISTORY_LIMIT);
    expect(history.canUndo).toBe(false);
  });

  it('clear 清空全部历史', () => {
    const history = new SchemaHistory();
    history.push(base, 'edit', null, 1000);
    history.push(schema({ a: {} }), 'edit', null, 2000);
    history.undo(schema({}));
    history.clear();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.size).toBe(0);
  });
});