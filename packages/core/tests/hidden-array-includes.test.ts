import { describe, it, expect } from 'vitest';
import { NexusEngine } from '../src';
import type { NexusSchema } from '../src/types/schema';

describe('hidden expression with array includes (issue repro)', () => {
  it('hidden: "{{!formData.implType.includes(\'关联附件\')}}" should work when implType is array', () => {
    const engine = new NexusEngine();

    const schema: NexusSchema = {
      type: 'object',
      properties: {
        implType: {
          title: '产品设计类型',
          type: 'array',
          enum: [
            '关联PR/PF/FR（执剑者）',
            '关联产品功能（ITOS）',
            '关联附件',
          ],
          enumNames: [
            '关联PR/PF/FR（执剑者）',
            '关联产品功能（ITOS）',
            '关联附件',
          ],
          widget: 'multiSelect',
          required: '1',
          default: ['关联PR/PF/FR（执剑者）'],
          description: '下拉多选',
          items: { type: 'string' },
          dependencies: [],
        },
        attachmentField: {
          title: '附件内容',
          type: 'string',
          widget: 'input',
          hidden: "{{!formData.implType.includes('关联附件')}}",
        },
      },
    };

    engine.init(schema);

    // 初始默认不含'关联附件' → hidden=true
    expect(engine.getFieldState('attachmentField')!.hidden).toBe(true);

    // 选择包含'关联附件' → hidden=false
    engine.setFieldValue('implType', [
      '关联PR/PF/FR（执剑者）',
      '关联附件',
    ]);
    expect(engine.getFieldState('attachmentField')!.hidden).toBe(false);
  });

  it('hidden expression should react when array changes from having to not having the value', () => {
    const engine = new NexusEngine();

    const schema: NexusSchema = {
      type: 'object',
      properties: {
        implType: {
          type: 'array',
          widget: 'multiSelect',
          enum: ['A', 'B', 'C'],
          enumNames: ['A', 'B', 'C'],
          default: ['A', 'C'],
          items: { type: 'string' },
        },
        showField: {
          type: 'string',
          widget: 'input',
          default: 'visible',
          hidden: "{{!formData.implType.includes('C')}}",
        },
      },
    };

    engine.init(schema);

    // 初始默认包含'C' → hidden=false
    expect(engine.getFieldState('showField')!.hidden).toBe(false);
    expect(engine.getFormData().showField).toBe('visible');

    // 移除'C' → hidden=true
    engine.setFieldValue('implType', ['A']);
    expect(engine.getFieldState('showField')!.hidden).toBe(true);
    expect(engine.getFormData().showField).toBeUndefined();

    // 重新添加'C' → hidden=false
    engine.setFieldValue('implType', ['A', 'C']);
    expect(engine.getFieldState('showField')!.hidden).toBe(false);
  });
});
