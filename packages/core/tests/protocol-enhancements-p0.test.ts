/**
 * 协议增强测试（一）：校验能力完整化
 * 覆盖：
 * - 字段级约束自动转规则（x-render / JSON Schema 对齐）
 * - 消息模板插值 & 默认/可配置消息（async-validator 对齐）
 * - trigger 全语义（blur 修复 + 提交全量校验）
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/Engine';
import type { NexusSchema } from '../src/types/schema';

describe('字段级约束自动转规则（x-render / JSON Schema 对齐）', () => {
  it('number 字段的 min/max 自动转数值校验', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        age: { type: 'number', min: 18, max: 60, title: '年龄' },
      },
    };
    engine.init(schema);
    engine.setFieldValue('age', 10);
    expect(engine.getFieldError('age')).toContain('年龄 不能小于 18');
    engine.setFieldValue('age', 30);
    expect(engine.getFieldError('age')).toEqual([]);
  });

  it('string 字段的 min/max 自动转长度校验', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        nickname: { type: 'string', min: 3, max: 10, title: '昵称' },
      },
    };
    engine.init(schema);
    engine.setFieldValue('nickname', 'ab');
    expect(engine.getFieldError('nickname')).toContain('昵称 不能小于 3');
    engine.setFieldValue('nickname', 'abcdefghijklmn');
    expect(engine.getFieldError('nickname')).toContain('昵称 不能大于 10');
  });

  it('pattern 字段级声明自动转正则校验', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        phone: { type: 'string', pattern: '^\\d{11}$', title: '手机号' },
      },
    };
    engine.init(schema);
    engine.setFieldValue('phone', 'abc');
    expect(engine.getFieldError('phone')).toContain('手机号 格式不正确');
    engine.setFieldValue('phone', '13800138000');
    expect(engine.getFieldError('phone')).toEqual([]);
  });

  it('format: email/url 自动附加格式校验', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', title: '邮箱' },
        site: { type: 'string', format: 'url', title: '网址' },
      },
    };
    engine.init(schema);
    engine.setFieldValue('email', 'not-an-email');
    expect(engine.getFieldError('email')).toContain('邮箱 格式不正确');
    engine.setFieldValue('site', 'https://example.com');
    expect(engine.getFieldError('site')).toEqual([]);
  });

  it('用户已在 rules 声明约束时不重复生成', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          min: 3,
          title: '姓名',
          rules: [{ min: 5, message: '自定义最小长度', trigger: 'change' }],
        },
      },
    };
    engine.init(schema);
    engine.setFieldValue('name', 'ab');
    expect(engine.getFieldError('name')).toEqual(['自定义最小长度']);
  });

  it('rules 内 len/enum/whitespace 新规则类型生效', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          title: '验证码',
          rules: [{ len: 6, message: '验证码需 6 位', trigger: 'change' }],
        },
        city: {
          type: 'string',
          title: '城市',
          rules: [{ enum: ['上海', '北京'], trigger: 'change' }],
        },
        note: {
          type: 'string',
          title: '备注',
          rules: [{ whitespace: true, trigger: 'change' }],
        },
      },
    };
    engine.init(schema);
    engine.setFieldValue('code', '123');
    expect(engine.getFieldError('code')).toContain('验证码需 6 位');
    engine.setFieldValue('city', '广州');
    expect(engine.getFieldError('city')).toContain('城市 不在可选范围内');
    engine.setFieldValue('note', '   ');
    expect(engine.getFieldError('note')).toContain('备注 不能为空白');
  });
});

describe('校验消息模板与默认消息（async-validator 对齐）', () => {
  it('rule.message 支持 {min}/{max}/{len}/{title} 占位符插值', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: '用户名',
          rules: [
            { min: 3, message: '长度需在 {min} 以上', trigger: 'change' },
          ],
        },
      },
    };
    engine.init(schema);
    engine.setFieldValue('name', 'a');
    expect(engine.getFieldError('name')).toContain('长度需在 3 以上');
  });

  it('省略 message 时使用内置默认消息', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: '用户名',
          rules: [{ min: 3, trigger: 'change' }],
        },
      },
    };
    engine.init(schema);
    engine.setFieldValue('name', 'a');
    expect(engine.getFieldError('name')).toContain('用户名 不能小于 3');
  });

  it('engine options.messages 可覆盖默认消息模板', () => {
    const engine = new NexusEngine({
      messages: {
        required: '{title} 不能为空',
        min: '{title} 最小值为 {min}',
      },
    });
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '用户名', required: true },
        age: { type: 'number', title: '年龄', min: 18 },
      },
    };
    engine.init(schema);
    engine.setFieldValue('name', '');
    expect(engine.getFieldError('name')).toContain('用户名 不能为空');
    engine.setFieldValue('age', 10);
    expect(engine.getFieldError('age')).toContain('年龄 最小值为 18');
  });

  it('rule.message 优先级高于 messages 配置与默认', () => {
    const engine = new NexusEngine({ messages: { min: '配置模板 {min}' } });
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        age: {
          type: 'number',
          title: '年龄',
          rules: [{ min: 18, message: '规则优先', trigger: 'change' }],
        },
      },
    };
    engine.init(schema);
    engine.setFieldValue('age', 10);
    expect(engine.getFieldError('age')).toEqual(['规则优先']);
  });

  it('messages.required 覆盖在实时与提交（validate）路径保持一致', async () => {
    const engine = new NexusEngine({
      messages: { required: '{title} 不能为空' },
    });
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: '用户名', required: true },
      },
    };
    engine.init(schema);
    engine.setFieldValue('name', '');
    expect(engine.getFieldError('name')).toEqual(['用户名 不能为空']);
    const errors = await engine.validate();
    expect(errors.get('name')).toEqual(['用户名 不能为空']);
  });
});

describe('trigger 全语义（blur 修复 + 提交全量校验）', () => {
  it('blur 规则不在 change 实时校验中生效', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: '用户名',
          rules: [{ min: 3, message: '失焦校验', trigger: 'blur' }],
        },
      },
    };
    engine.init(schema);
    engine.setFieldValue('name', 'ab');
    expect(engine.getFieldError('name')).toEqual([]);
  });

  it('validateField(path, { trigger: "blur" }) 触发 blur 规则（组件 onBlur 使用）', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: '用户名',
          rules: [{ min: 3, message: '失焦校验', trigger: 'blur' }],
        },
      },
    };
    engine.init(schema);
    engine.setFieldValue('name', 'ab');
    engine.validateField('name', { trigger: 'blur' });
    expect(engine.getFieldError('name')).toContain('失焦校验');
  });

  it('blur 校验通过后错误清除', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: '用户名',
          rules: [{ min: 3, trigger: 'blur' }],
        },
      },
    };
    engine.init(schema);
    engine.setFieldValue('name', 'ab');
    engine.validateField('name', { trigger: 'blur' });
    expect(engine.getFieldError('name')).toHaveLength(1);
    engine.setFieldValue('name', 'abcd');
    engine.validateField('name', { trigger: 'blur' });
    expect(engine.getFieldError('name')).toEqual([]);
  });

  it('validate()（提交）全量校验所有 trigger 规则', async () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'string',
          title: '字段A',
          rules: [
            { min: 3, message: 'change规则', trigger: 'change' },
            { min: 4, message: 'blur规则', trigger: 'blur' },
            { min: 5, message: 'submit规则', trigger: 'submit' },
          ],
        },
      },
    };
    engine.init(schema);
    engine.setFieldValue('a', 'ab');
    expect(engine.getFieldError('a')).toEqual(['change规则']);
    const errors = await engine.validate();
    expect(errors.get('a')).toEqual(
      expect.arrayContaining(['change规则', 'blur规则', 'submit规则']),
    );
  });
});
