/**
 * init() 前 setValues 缓冲测试
 *
 * 覆盖：表单渲染（engine.init）之前调用 setFieldValues / setFieldValue，
 * 值被缓冲并在 init() 时合并为 initialValues，页面字段正常拿到值。
 */

import { describe, expect, it, vi } from 'vitest';
import { NexusEngine } from '../src/Engine';
import type { NexusSchema } from '../src/types/schema';

const schema: NexusSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', widget: 'input' },
    profile: {
      type: 'object',
      properties: {
        city: { type: 'string', widget: 'input' },
      },
    },
  },
};

describe('init 前 setValues 缓冲', () => {
  it('setFieldValues 先于 init 执行：init 后字段值生效', () => {
    const engine = new NexusEngine();
    engine.setFieldValues({ username: 'zhangsan', 'profile.city': '北京' });

    expect(engine.getSchema()).toBeNull();

    engine.init(schema);
    expect(engine.getFieldValue('username')).toBe('zhangsan');
    expect(engine.getFieldValue('profile.city')).toBe('北京');
  });

  it('setFieldValue 先于 init 执行：init 后字段值生效', () => {
    const engine = new NexusEngine();
    engine.setFieldValue('username', 'lisi');

    engine.init(schema);
    expect(engine.getFieldValue('username')).toBe('lisi');
  });

  it('缓冲值优先于 initialValues（显式赋值不被 init 覆盖）', () => {
    const engine = new NexusEngine();
    engine.setFieldValues({ username: '显式赋值' });

    engine.init(schema, { username: 'initialValues' });
    expect(engine.getFieldValue('username')).toBe('显式赋值');
  });

  it('init 后缓冲清空：reset 恢复合并后的初始快照（含缓冲值）', () => {
    const engine = new NexusEngine();
    engine.setFieldValues({ username: '缓冲值' });
    engine.init(schema, { username: '初始值' });
    expect(engine.getFieldValue('username')).toBe('缓冲值');

    // 缓冲值已并入 initialValues 快照：reset 恢复「缓冲值 + initialValues 其余键」
    engine.reset();
    expect(engine.getFieldValue('username')).toBe('缓冲值');

    // 缓冲已清空：再次 setValues 走正常路径（可被 setSchema 保留）
    engine.setFieldValues({ username: '正常赋值' });
    engine.setSchema(schema);
    expect(engine.getFieldValue('username')).toBe('正常赋值');
  });

  it('init 后的 setValues 行为不变（不进入缓冲）', () => {
    const engine = new NexusEngine();
    engine.init(schema);
    engine.setFieldValues({ username: '正常赋值' });

    expect(engine.getFieldValue('username')).toBe('正常赋值');

    // 未知路径仍走原警告路径，不受缓冲影响
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    engine.setFieldValue('unknown.path', 1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
