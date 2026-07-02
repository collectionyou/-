import { NORMAL_PLUGIN } from './normal';

// 转换为 JSON 格式
// https://www.lambdatest.com/free-online-tools/json-escape
export const SystemPluginList = [
  {
    type: 'guide',
    title: '我有兴趣为懒人客服\n贡献工具',
    description: '',
    tags: [],
    icon: '📘',
  },
  {
    type: 'plugin',
    title: '默认客服插件',
    author: '系统插件',
    description:
      '默认流程：先关键词匹配，未命中再按 AI 配置生成回复，AI 失败后转人工。',
    tags: ['系统'],
    code: NORMAL_PLUGIN,
    icon: '⚙️',
  },
  {
    type: 'plugin',
    title: 'AI 接入插件',
    author: '系统插件',
    description:
      '用于接入 DeepSeek 等兼容接口，逻辑为先关键词，未命中再走 AI，AI 失败后转人工。',
    tags: ['系统', 'AI'],
    code: NORMAL_PLUGIN,
    icon: '🤖',
  },
];
