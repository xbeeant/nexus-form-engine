/**
 * setFieldValues 联动时 formData 快照一致性测试
 *
 * 覆盖：setFieldValues 批量写入时，reactions 中 getFormData 拿到的是
 *       **所有字段写入后**的完整快照，而非中间态。
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/engine';
import type { NexusSchema } from '../src/types/schema';

describe('setFieldValues 联动 formData 快照一致性', () => {
  it('setFieldValues 批量写入时，hidden 的 reaction 中 formData 为完整快照', () => {
    const engine = new NexusEngine();
    let capturedFormData: Record<string, unknown> | undefined;

    const schema: NexusSchema = {
      type: 'object',
      properties: {
        type: { type: 'string', widget: 'select' },
        optionA: {
          type: 'string',
          widget: 'input',
          hidden: "{{ formData.type !== 'a' }}",
        },
        optionB: {
          type: 'string',
          widget: 'input',
          hidden: "{{ formData.type !== 'b' }}",
        },
        computed: {
          type: 'string',
          widget: 'input',
          reactions: [
            {
              dependencies: ['type', 'optionA', 'optionB'],
              when: "{{ formData.type === 'a' }}",
              fulfill: {
                state: {
                  value: "{{ formData.optionA + '-' + formData.optionB }}",
                },
              },
            },
          ],
        },
      },
    };

    engine.init(schema);
    engine.setFieldValues({ type: 'a', optionA: 'hello', optionB: 'world' });

    expect(engine.getFieldValue('type')).toBe('a');
    expect(engine.getFieldValue('optionA')).toBe('hello');
    expect(engine.getFieldValue('optionB')).toBe('world');
    expect(engine.getFieldValue('computed')).toBe('hello-world');
  });

  it('setFieldValues 多字段联动时，后续字段 reaction 可读取到前置字段新值', () => {
    const engine = new NexusEngine();
    const formDataSnapshots: Record<string, unknown>[] = [];

    const schema: NexusSchema = {
      type: 'object',
      properties: {
        fieldA: { type: 'string', widget: 'input' },
        fieldB: { type: 'string', widget: 'input' },
        fieldC: {
          type: 'string',
          widget: 'input',
          reactions: [
            {
              dependencies: ['fieldA', 'fieldB'],
              fulfill: {
                state: {
                  hidden:
                    "{{ formData.fieldA === '' && formData.fieldB === '' }}",
                },
              },
            },
          ],
        },
      },
    };

    engine.init(schema);

    // 捕获 reaction 执行时 formData 快照
    const originalExecuteReaction = (engine as any).executeReaction.bind(
      engine,
    );
    (engine as any).executeReaction = function (
      targetPath: string,
      reaction: any,
      formData: any,
    ) {
      if (targetPath === 'fieldC' && formData) {
        formDataSnapshots.push(formData);
      }
      return originalExecuteReaction(targetPath, reaction, formData);
    };

    // 同时设置 fieldA 和 fieldB，fieldC 的 hidden reaction 应能拿到完整 formData
    engine.setFieldValues({ fieldA: 'x', fieldB: 'y' });

    // fieldC 不应被隐藏
    expect(engine.getFieldState('fieldC')!.hidden).toBe(false);

    // formData 快照中应同时包含 fieldA 和 fieldB 的新值
    for (const snap of formDataSnapshots) {
      expect(snap.fieldA).toBe('x');
      expect(snap.fieldB).toBe('y');
    }
  });

  it('setFieldValues 后，hidden 表达式正确读取最新值', () => {
    const engine = new NexusEngine();

    const schema: NexusSchema = {
      type: 'object',
      properties: {
        showPanel: { type: 'boolean', widget: 'switch' },
        panelField: {
          type: 'string',
          widget: 'input',
          hidden: "{{ !formData.showPanel }}",
        },
      },
    };

    engine.init(schema);

    // 初始状态：panelField 隐藏
    expect(engine.getFieldState('panelField')!.hidden).toBe(true);

    // 同时设置 showPanel = true，panelField 应取消隐藏
    engine.setFieldValues({ showPanel: true, panelField: 'visible' });
    expect(engine.getFieldState('panelField')!.hidden).toBe(false);
    expect(engine.getFieldValue('panelField')).toBe('visible');
  });

  it('setFieldValues 与 setFieldValue 行为一致：reactions 都能拿到最新值', () => {
    const engine = new NexusEngine();

    const schema: NexusSchema = {
      type: 'object',
      properties: {
        fieldA: { type: 'string', widget: 'input' },
        fieldB: { type: 'string', widget: 'input' },
        result: {
          type: 'string',
          widget: 'input',
          reactions: [
            {
              dependencies: ['fieldA', 'fieldB'],
              fulfill: {
                state: {
                  value: "{{ formData.fieldA + formData.fieldB }}",
                },
              },
            },
          ],
        },
      },
    };

    engine.init(schema);

    // setFieldValues 方式
    engine.setFieldValues({ fieldA: 'A', fieldB: 'B' });
    expect(engine.getFieldValue('result')).toBe('AB');

    // setFieldValue 方式（逐个设置）
    engine.init(schema);
    engine.setFieldValue('fieldA', 'X');
    engine.setFieldValue('fieldB', 'Y');
    expect(engine.getFieldValue('result')).toBe('XY');
  });

  it('setFieldValues 带 bind 时，reactions 中 formData 使用 bind 转换后的路径', () => {
    const engine = new NexusEngine();

    const schema: NexusSchema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string', widget: 'input', bind: 'userName' },
            age: { type: 'number', widget: 'input', bind: 'userAge' },
            display: {
              type: 'string',
              widget: 'input',
              reactions: [
                {
                  dependencies: ['userName', 'userAge'],
                  fulfill: {
                    state: {
                      value:
                        "{{ formData.userName + '-' + formData.userAge }}",
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    engine.init(schema);
    engine.setFieldValues({ userName: 'Alice', userAge: 30 });

    // getFieldValue 按字段路径（非 bind 路径）取值
    expect(engine.getFieldValue('user.name')).toBe('Alice');
    expect(engine.getFieldValue('user.age')).toBe(30);
    expect(engine.getFieldValue('user.display')).toBe('Alice-30');
  });
});
