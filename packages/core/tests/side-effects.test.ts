/**
 * sideEffects 附带编辑器 / 点击动作测试（P1-4，x-render `sideEffects` / `onClickAction` 对齐）
 *
 * 覆盖：
 * 1. Schema `sideEffects` 声明 → 解析进 FieldState.meta.sideEffects
 * 2. schema 级 editor 配置（字符串 / 对象形态）透传
 * 3. registerEditors / getEditor 注册与查找
 * 4. 编辑器注册到插件（antdPreset 形态：plugin.editors）
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/engine';
import * as SchemaParser from '../src/schema-parser';

describe('sideEffects 附带编辑器解析（P1-4）', () => {
  it('字符串形态 sideEffects 进入 FieldState.meta，editor 默认 textarea', () => {
    const result = SchemaParser.parse({
      type: 'object',
      properties: {
        bio: {
          type: 'string',
          widget: 'input',
          sideEffects: 'textarea',
        },
      },
    });

    const state = result.fieldStates.get('bio');
    expect(state?.meta.sideEffects).toEqual('textarea');
  });

  it('对象形态 sideEffects 完整透传（editor/title/mode/props）', () => {
    const result = SchemaParser.parse({
      type: 'object',
      properties: {
        content: {
          type: 'string',
          widget: 'input',
          sideEffects: {
            editor: 'html',
            title: '编辑内容',
            mode: 'drawer',
            props: { rows: 10 },
          },
        },
      },
    });

    const state = result.fieldStates.get('content');
    expect(state?.meta.sideEffects).toEqual({
      editor: 'html',
      title: '编辑内容',
      mode: 'drawer',
      props: { rows: 10 },
    });
    // 透传 props 不应进入字段 props（sideEffects 是独立槽位）
    expect(state?.props.rows).toBeUndefined();
  });

  it('sideEffects 不影响字段值 / 校验规则', () => {
    const result = SchemaParser.parse({
      type: 'object',
      properties: {
        bio: {
          type: 'string',
          widget: 'input',
          sideEffects: { editor: 'textarea', title: '自我介绍' },
        },
      },
    });

    const state = result.fieldStates.get('bio');
    // string 字段默认值与 sideEffects 无关（类型默认值 ''）
    expect(state?.value).not.toBeUndefined();
    expect(state?.meta.rules).toHaveLength(0);
    expect(state?.visible).toBe(true);
  });
});

describe('编辑器组件注册（engine.registerEditors / getEditor）', () => {
  it('registerEditors 后可 getEditor 查找', () => {
    const engine = new NexusEngine();
    const textareaEditor = () => null;
    const htmlEditor = () => null;

    engine.registerEditors({
      textarea: textareaEditor,
      html: htmlEditor,
    });

    expect(engine.getEditor('textarea')).toBe(textareaEditor);
    expect(engine.getEditor('html')).toBe(htmlEditor);
    expect(engine.getEditor('not-registered')).toBeUndefined();
  });

  it('插件 use 时注册 editors（plugin.editors）', () => {
    const engine = new NexusEngine();
    const jsonEditor = () => null;
    const plugin = {
      name: 'test-editors',
      editors: { json: jsonEditor },
    };

    engine.use(plugin as any);
    expect(engine.getEditor('json')).toBe(jsonEditor);
  });

  it('destroy 后编辑器注册表清空', () => {
    const engine = new NexusEngine();
    const textareaEditor = () => null;
    engine.registerEditors({ textarea: textareaEditor });
    expect(engine.getEditor('textarea')).toBe(textareaEditor);

    engine.destroy();
    expect(engine.getEditor('textarea')).toBeUndefined();
  });
});
