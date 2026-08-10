/**
 * 实时校验复盘测试
 * 复现：表单值变化后，实时校验结果（错误）是否及时更新
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/Engine';
import type { NexusSchema } from '../src/types/schema';

describe('realtime validation', () => {
  it('required 清空报错、输入后清除', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        username: { type: 'string', widget: 'input', required: true },
      },
    };
    engine.init(schema);
    engine.setFieldValue('username', '');
    expect(engine.getFieldError('username')).toContain('username 为必填项');
    engine.setFieldValue('username', 'abc');
    expect(engine.getFieldError('username')).toEqual([]);
  });

  it('无 trigger 的 min 规则实时生效与清除', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          widget: 'input',
          rules: [{ min: 3, message: '长度需 3+', trigger: 'change' }],
        },
      },
    };
    engine.init(schema);
    engine.setFieldValue('username', 'ab');
    expect(engine.getFieldError('username')).toContain('长度需 3+');
    engine.setFieldValue('username', 'abcdef');
    expect(engine.getFieldError('username')).toEqual([]);
  });

  it('trigger submit 规则仅在提交时校验，实时不生效', async () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          widget: 'input',
          rules: [{ min: 3, message: '长度需 3+', trigger: 'submit' }],
        },
      },
    };
    engine.init(schema);
    engine.setFieldValue('username', 'ab');
    expect(engine.getFieldError('username')).toEqual([]);
    const errors = await engine.validate();
    expect(errors.get('username')).toContain('长度需 3+');
  });
});