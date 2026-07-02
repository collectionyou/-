export const NORMAL_PLUGIN = `const cc = require('config_srv');
const rp = require('reply_srv');

/**
 * 插件主函数
 * @param {AppContext} ctx - 上下文信息
 * @param {Message[]} messages - 消息数组
 * @returns {Reply} 插件执行结果
 */
async function main(ctx, messages) {
  const cfg = await cc.get(ctx);
  const lastUserMsg = messages
    .slice()
    .reverse()
    .find((msg) => msg.role === 'OTHER');

  if (!lastUserMsg) {
    return {
      type: 'NO_REPLY',
      content: '',
    };
  }

  const data = await rp.matchKeyword(ctx, lastUserMsg);
  if (data && data.content) {
    return data;
  }

  if (cfg && cfg.has_use_gpt) {
    const aiReply = await rp.getLLMResponse(cfg, ctx, messages);
    if (aiReply && aiReply.content) {
      return aiReply;
    }
  }

  return {
    type: 'TRANSFER',
    content: '未匹配关键词，需人工接管',
  };
}`;
