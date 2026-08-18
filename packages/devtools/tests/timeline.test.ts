import { NexusEngine } from '@xbeeant/form-engine';
import { describe, expect, it } from 'vitest';

import { DEVTOOLS_PLUGIN_NAME, DevToolsEventPlugin } from '../src/timeline';

const schema = {
  type: 'object',
  properties: {
    province: {
      type: 'string',
      widget: 'input',
      requiredOn: "{{ formData.country === 'CN' }}",
    },
    country: { type: 'string', widget: 'input' },
    tags: { type: 'array', widget: 'list', items: { type: 'string' } },
  },
};

describe('DevToolsEventPlugin（事件时间线采集）', () => {
  it('采集 init / 值变更 / 校验 / 数组操作事件', () => {
    const engine = new NexusEngine();
    const collected: string[] = [];
    const plugin = new DevToolsEventPlugin({
      onEvent: (e) => collected.push(`${e.type}:${e.path ?? ''}`),
    });
    engine.use(plugin);

    engine.init(schema as never);
    expect(collected).toContain('init:');
    expect(collected.length).toBe(1);

    engine.setFieldValue('country', 'CN');
    expect(collected).toContain('value:country');

    // requiredOn 联动触发国家字段自身的校验
    engine.validateField('province');
    expect(collected.some((e) => e.startsWith('validate-field:province'))).toBe(
      true,
    );

    engine.validate();
    expect(collected).toContain('validate:');
    expect(collected.some((e) => e.startsWith('validate-done:'))).toBe(true);

    engine.arrayOperation({
      path: 'tags',
      operation: 'push',
      value: ['a'],
    });
    expect(collected.some((e) => e.startsWith('array:tags'))).toBe(true);
  });

  it('paused 时跳过采集', () => {
    const engine = new NexusEngine();
    let paused = false;
    const collected: string[] = [];
    const plugin = new DevToolsEventPlugin({
      onEvent: (e) => collected.push(e.type),
      isPaused: () => paused,
    });
    engine.use(plugin);

    engine.init(schema as never);
    expect(collected.length).toBe(1);

    // 值变更触发：validate-field（旧值校验）→ value 事件（顺序由引擎决定，只断言存在性）
    engine.setFieldValue('country', 'CN');
    expect(collected.some((e) => e === 'value')).toBe(true);
    const countAfterSet = collected.length;

    paused = true;
    engine.setFieldValue('country', 'US');
    expect(collected.length).toBe(countAfterSet);

    paused = false;
    engine.setFieldValue('country', 'JP');
    expect(collected.length).toBe(countAfterSet + 2);
  });

  it('事件上限裁剪（maxEvents）', () => {
    const engine = new NexusEngine();
    const plugin = new DevToolsEventPlugin({ onEvent: () => {}, maxEvents: 5 });
    engine.use(plugin);

    engine.init(schema as never);
    for (let i = 0; i < 10; i++) {
      engine.setFieldValue('country', `v${i}`);
    }
    expect(plugin.getEvents().length).toBe(5);
    // 保留最新 5 条：最后一次 setFieldValue 的 value 事件
    expect(plugin.getEvents()[4].type).toBe('value');
  });

  it('插件名幂等标识存在', () => {
    expect(DEVTOOLS_PLUGIN_NAME).toBe('nexus-devtools-events');
  });

  it('clear 清空时间线', () => {
    const engine = new NexusEngine();
    const plugin = new DevToolsEventPlugin({ onEvent: () => {} });
    engine.use(plugin);
    engine.init(schema as never);
    expect(plugin.getEvents().length).toBe(1);
    plugin.clear();
    expect(plugin.getEvents().length).toBe(0);
  });
});