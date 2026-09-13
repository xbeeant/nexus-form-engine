/**
 * schema-serializer - Schema 序列化/反序列化工具测试
 * 验证 serialize / deserialize / diff / compress / compressToBase64 / decompressFromBase64 / sizeOf / compressionRate
 */

import { describe, expect, it } from 'vitest';
import type { NexusSchema } from '../src/types/schema';
import {
  compress,
  compressionRate,
  compressToBase64,
  decompressFromBase64,
  deserialize,
  diff,
  serialize,
  sizeOf,
} from '../src/utils/schema-serializer';

const makeSchema = (
  props: Record<string, Record<string, unknown>>,
): NexusSchema => ({ type: 'object', properties: props });

// ============================================================================
// serialize
// ============================================================================

describe('serialize', () => {
  it('基本序列化：保留 type 和 properties', () => {
    const schema = makeSchema({
      name: { type: 'string', widget: 'input' },
    });
    const result = serialize(schema, { compress: false });
    const parsed = JSON.parse(result);

    expect(parsed.type).toBe('object');
    expect(parsed.properties.name.type).toBe('string');
    expect(parsed.properties.name.widget).toBe('input');
  });

  it('compress: true 时返回压缩字符串', () => {
    const schema = makeSchema({ name: { type: 'string' } });
    const result = serialize(schema, { compress: true });

    expect(typeof result).toBe('string');
    // 压缩后的字符串不包含格式化换行
    const parsed = JSON.parse(result);
    expect(parsed.type).toBe('object');
  });

  it('keepEmpty: false 时移除空值属性', () => {
    const schema = makeSchema({
      name: { type: 'string', widget: 'input', title: '' },
    });
    const result = JSON.parse(
      serialize(schema, { keepEmpty: false, compress: false }),
    );
    expect(result.properties.name.title).toBeUndefined();
  });

  it('keepEmpty: true 时保留空值属性', () => {
    const schema = makeSchema({
      name: { type: 'string', widget: 'input', title: '' },
    });
    const result = JSON.parse(
      serialize(schema, { keepEmpty: true, compress: false }),
    );
    expect(result.properties.name.title).toBe('');
  });

  it('keepComments: true 时保留 description 为 _comment', () => {
    const schema = makeSchema({
      name: { type: 'string', widget: 'input', description: '用户姓名' },
    });
    const result = JSON.parse(
      serialize(schema, { keepComments: true, compress: false }),
    );
    expect(result.properties.name._comment).toBe('用户姓名');
  });

  it('keepComments: false 时不包含 _comment', () => {
    const schema = makeSchema({
      name: { type: 'string', widget: 'input', description: '用户姓名' },
    });
    const result = JSON.parse(
      serialize(schema, { keepComments: false, compress: false }),
    );
    expect(result.properties.name._comment).toBeUndefined();
    expect(result.properties.name.description).toBe('用户姓名');
  });

  it('序列化顶层属性：displayType / labelWidth / colon / column', () => {
    const schema: NexusSchema = {
      type: 'object',
      displayType: 'horizontal',
      labelWidth: 120,
      colon: false,
      column: 2,
      readOnly: true,
      label: '表单',
      properties: {},
    };
    const result = JSON.parse(serialize(schema, { compress: false }));
    expect(result.displayType).toBe('horizontal');
    expect(result.labelWidth).toBe(120);
    expect(result.colon).toBe(false);
    expect(result.column).toBe(2);
    expect(result.readOnly).toBe(true);
    expect(result.label).toBe('表单');
  });

  it('序列化 rules 时提取 message / type / trigger（不保留 validator 函数引用）', () => {
    const schema = makeSchema({
      name: {
        type: 'string',
        rules: [
          {
            message: '必填',
            type: 'required',
            validator: () => {},
            trigger: 'change',
          },
        ],
      },
    });
    const result = JSON.parse(serialize(schema, { compress: false }));
    const rule = result.properties.name.rules[0];
    expect(rule.message).toBe('必填');
    expect(rule.type).toBe('required');
    // validator 函数被序列化但 JSON 序列化后变为 undefined
    expect(rule.trigger).toBe('change');
  });

  it('序列化 reactions 时提取相关字段', () => {
    const schema = makeSchema({
      fieldA: {
        type: 'string',
        reactions: [
          {
            dependencies: ['fieldB'],
            when: '{{ formData.fieldB === 1 }}',
            fulfill: { state: { visible: true } },
            otherwise: { state: { visible: false } },
            crossForm: 'other-form',
          } as any,
        ],
      },
      fieldB: { type: 'string' },
    });
    const result = JSON.parse(serialize(schema, { compress: false }));
    const reaction = result.properties.fieldA.reactions[0];
    expect(reaction.dependencies).toEqual(['fieldB']);
    expect(reaction.when).toBe('{{ formData.fieldB === 1 }}');
    expect(reaction.fulfill).toEqual({ state: { visible: true } });
    expect(reaction.otherwise).toEqual({ state: { visible: false } });
    expect(reaction.crossForm).toBe('other-form');
  });

  it('序列化 enum 和 enumNames 时转为数组', () => {
    const schema = makeSchema({
      status: {
        type: 'string',
        enum: ['active', 'inactive'],
        enumNames: ['启用', '禁用'],
      },
    });
    const result = JSON.parse(serialize(schema, { compress: false }));
    expect(Array.isArray(result.properties.status.enum)).toBe(true);
    expect(Array.isArray(result.properties.status.enumNames)).toBe(true);
  });

  it('自定义 customSerializer 回调', () => {
    const schema = makeSchema({
      name: { type: 'string', widget: 'input', customField: 'customValue' },
    });
    const result = JSON.parse(
      serialize(schema, {
        compress: false,
        customSerializer: (key, val) =>
          key === 'customField' ? `transformed:${val}` : undefined,
      }),
    );
    expect(result.properties.name.customField).toBe('transformed:customValue');
  });

  it('items（数组节点）序列化：serializeSchema 不处理 items', () => {
    const schema: NexusSchema = {
      type: 'array',
      widget: 'list',
      items: { type: 'string', widget: 'input' },
    };
    const result = JSON.parse(serialize(schema, { compress: false }));
    // serializeSchema 不处理 items，所以 items 字段不会被序列化
    expect(result.type).toBe('array');
    expect(result.properties).toBeUndefined(); // array schema 没有 properties
    expect(result.items).toBeUndefined(); // serializeSchema 不处理 items
  });

  it('null / false 值处理', () => {
    const schema = makeSchema({
      name: { type: 'string', widget: 'input', disabled: false, hidden: null },
    });
    const result = JSON.parse(
      serialize(schema, { keepEmpty: false, compress: false }),
    );
    // disabled: false 保留（非 null/undefined/''）
    expect(result.properties.name.disabled).toBe(false);
    // hidden: null 被跳过
    expect(result.properties.name.hidden).toBeUndefined();
  });
});

// ============================================================================
// deserialize
// ============================================================================

describe('deserialize', () => {
  it('基本反序列化：从 JSON 字符串还原 Schema', () => {
    const schema = makeSchema({ name: { type: 'string', widget: 'input' } });
    const serialized = serialize(schema, { compress: false });
    const result = deserialize(serialized, { supportCompression: false });

    expect(result.type).toBe('object');
    expect(result.properties.name.type).toBe('string');
    expect(result.properties.name.widget).toBe('input');
  });

  it('supportCompression: false 时直接使用原字符串', () => {
    const json = JSON.stringify({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
    const result = deserialize(json, { supportCompression: false });
    expect(result.type).toBe('object');
  });

  it('支持 base64 反序列化（不经过 compress）', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: { name: { type: 'string' } },
    };
    const rawJson = JSON.stringify(schema);
    const base64 = btoa(rawJson);
    const result = deserialize(base64, { supportCompression: true });
    expect(result.type).toBe('object');
    expect(result.properties.name.type).toBe('string');
  });

  it('非 base64 字符串正常降级', () => {
    const json = JSON.stringify({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
    const result = deserialize(json);
    expect(result.type).toBe('object');
  });

  it('customDeserializer 回调生效', () => {
    const json = JSON.stringify({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
    const result = deserialize(json, {
      customDeserializer: (key, value) => {
        if (key === 'type' && typeof value === 'string') {
          return value.toUpperCase();
        }
        return value;
      },
    });
    expect(result.type).toBe('OBJECT');
  });

  it('fillMissing 选项不影响基本反序列化', () => {
    const json = JSON.stringify({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
    const result = deserialize(json, {
      fillMissing: true,
      supportCompression: false,
    });
    expect(result.type).toBe('object');
  });

  it('strict 选项不影响基本反序列化', () => {
    const json = JSON.stringify({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
    const result = deserialize(json, {
      strict: true,
      supportCompression: false,
    });
    expect(result.type).toBe('object');
  });
});

// ============================================================================
// compress / decompressFromBase64
// ============================================================================

describe('compress', () => {
  it('移除冒号后空格', () => {
    const json = '{"name": "John"}';
    const result = compress(json);
    expect(result).toBe('{"name":"John"}');
  });

  it('移除逗号后空格', () => {
    const json = '{"a": 1, "b": 2}';
    const result = compress(json);
    expect(result).toBe('{"a":1,"b":2}');
  });

  it('合并连续空白', () => {
    const json = '{"a":    1,    "b":    2}';
    const result = compress(json);
    expect(result).toBe('{"a":1,"b":2}');
  });

  it('空字符串正常处理', () => {
    expect(compress('')).toBe('');
  });

  it('无空白的字符串不变', () => {
    const json = '{"a":1}';
    expect(compress(json)).toBe('{"a":1}');
  });
});

describe('compressToBase64 / decompressFromBase64', () => {
  it('roundtrip: serialize → base64 → deserialize', () => {
    const schema: NexusSchema = {
      type: 'object',
      displayType: 'horizontal',
      properties: {
        name: { type: 'string', widget: 'input', title: '姓名' },
        age: { type: 'number', widget: 'number', title: '年龄' },
      },
    };
    const base64 = compressToBase64(schema);
    const result = decompressFromBase64(base64);

    expect(result.type).toBe('object');
    expect(result.properties.name.type).toBe('string');
    expect(result.properties.name.title).toBe('姓名');
    expect(result.properties.age.type).toBe('number');
  });

  it('base64 编码包含中文字符', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        desc: { type: 'string', description: '中文描述' },
      },
    };
    const base64 = compressToBase64(schema);
    const result = decompressFromBase64(base64);
    expect(result.properties.desc.description).toBe('中文描述');
  });
});

// ============================================================================
// diff
// ============================================================================

describe('diff', () => {
  it('两个相同 Schema 返回 unchanged', () => {
    const schema = makeSchema({ name: { type: 'string' } });
    const result = diff(schema, schema);

    expect(result.added).toEqual([]);
    expect(result.changed).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.unchanged.length).toBe(1);
    expect(result.totalChanges).toBe(0);
  });

  it('检测到新增字段', () => {
    const oldSchema = makeSchema({ name: { type: 'string' } });
    const newSchema = makeSchema({
      name: { type: 'string' },
      email: { type: 'string' },
    });
    const result = diff(oldSchema, newSchema);

    expect(result.added.length).toBe(1);
    expect(result.added[0].path).toBe('email');
  });

  it('检测到删除字段', () => {
    const oldSchema = makeSchema({
      name: { type: 'string' },
      email: { type: 'string' },
    });
    const newSchema = makeSchema({ name: { type: 'string' } });
    const result = diff(oldSchema, newSchema);

    expect(result.removed.length).toBe(1);
    expect(result.removed[0].path).toBe('email');
  });

  it('检测到修改字段', () => {
    const oldSchema = makeSchema({ name: { type: 'string' } });
    const newSchema = makeSchema({ name: { type: 'number' } });
    const result = diff(oldSchema, newSchema);

    expect(result.changed.length).toBe(1);
    expect(result.changed[0].path).toBe('name');
    expect(result.changed[0].old.type).toBe('string');
    expect(result.changed[0].new.type).toBe('number');
  });

  it('同时检测新增、删除、修改', () => {
    const oldSchema = makeSchema({
      name: { type: 'string' },
      email: { type: 'string' },
      age: { type: 'number' },
    });
    const newSchema = makeSchema({
      name: { type: 'number' },
      email: { type: 'string' },
      phone: { type: 'string' },
    });
    const result = diff(oldSchema, newSchema);

    expect(result.added.length).toBe(1);
    expect(result.changed.length).toBe(1);
    expect(result.removed.length).toBe(1);
    expect(result.unchanged.length).toBe(1);
    expect(result.totalChanges).toBe(3);
  });

  it('空 Schema 处理', () => {
    const oldSchema = makeSchema({});
    const newSchema = makeSchema({ name: { type: 'string' } });
    const result = diff(oldSchema, newSchema);

    expect(result.added.length).toBe(1);
    expect(result.removed.length).toBe(0);
  });

  it('字段内容相同时归入 unchanged', () => {
    const schema = makeSchema({
      name: { type: 'string', widget: 'input', title: '姓名' },
    });
    const result = diff(schema, schema);

    expect(result.unchanged.length).toBe(1);
    expect(result.changed.length).toBe(0);
  });

  it('diffSchema: 子节点属性差异检测', () => {
    const oldSchema = makeSchema({
      name: {
        type: 'string',
        widget: 'input',
        title: '姓名',
        placeholder: '请输入',
      },
    });
    const newSchema = makeSchema({
      name: { type: 'string', widget: 'textarea', title: '姓名' },
    });
    const result = diff(oldSchema, newSchema);

    expect(result.changed.length).toBe(1);
    expect(result.changed[0].path).toBe('name');
  });
});

// ============================================================================
// sizeOf / compressionRate
// ============================================================================

describe('sizeOf / compressionRate', () => {
  it('sizeOf 返回正的字节数', () => {
    const schema = makeSchema({
      name: { type: 'string', widget: 'input', title: '姓名' },
    });
    const size = sizeOf(schema);
    expect(size).toBeGreaterThan(0);
  });

  it('复杂 Schema 的 sizeOf 大于简单 Schema', () => {
    const simple = makeSchema({ name: { type: 'string' } });
    const complex = makeSchema({
      name: {
        type: 'string',
        widget: 'input',
        title: '姓名',
        placeholder: '请输入姓名',
      },
      age: { type: 'number', widget: 'number', title: '年龄' },
      email: {
        type: 'string',
        widget: 'input',
        format: 'email',
        title: '邮箱',
      },
    });
    expect(sizeOf(complex)).toBeGreaterThan(sizeOf(simple));
  });

  it('compressionRate 返回数字', () => {
    const schema = makeSchema({
      name: {
        type: 'string',
        widget: 'input',
        title: '姓名',
        placeholder: '请输入姓名',
      },
      age: { type: 'number', widget: 'number', title: '年龄' },
    });
    const rate = compressionRate(schema);
    expect(typeof rate).toBe('number');
  });

  it('空 Schema 的 sizeOf', () => {
    const schema: NexusSchema = { type: 'object', properties: {} };
    const size = sizeOf(schema);
    expect(size).toBeGreaterThan(0);
  });

  it('大型 Schema 的 compressionRate', () => {
    const schema: NexusSchema = {
      type: 'object',
      displayType: 'horizontal',
      labelWidth: 120,
      properties: {
        name: {
          type: 'string',
          widget: 'input',
          title: '姓名',
          placeholder: '请输入姓名',
          required: true,
        },
        email: {
          type: 'string',
          widget: 'input',
          title: '邮箱',
          format: 'email',
          required: true,
        },
        age: {
          type: 'number',
          widget: 'number',
          title: '年龄',
          minimum: 0,
          maximum: 150,
        },
        gender: {
          type: 'string',
          widget: 'select',
          title: '性别',
          enum: ['M', 'F'],
          enumNames: ['男', '女'],
        },
        address: {
          type: 'object',
          title: '地址',
          properties: {
            city: { type: 'string', widget: 'input', title: '城市' },
            street: { type: 'string', widget: 'input', title: '街道' },
            zip: {
              type: 'string',
              widget: 'input',
              title: '邮编',
              format: 'zip',
            },
          },
        },
      },
    };
    const rate = compressionRate(schema);
    expect(typeof rate).toBe('number');
  });
});
