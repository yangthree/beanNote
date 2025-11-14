// utils/env.js
// 环境配置管理

/**
 * 环境配置
 * 切换环境时，只需修改这里的 ENV 变量
 */
const ENV_CONFIG = {
  // 当前使用的环境：'dev' | 'prod'
  current: 'prod', // 上线前改为 'prod'
  
  // 环境 ID 配置
  envIds: {
    // 开发/测试环境
    // dev: 'test-3g3ho1oo318ec768',
    dev: 'test-3g3ho1oo318ec768',
    // 生产环境（需要替换为实际的生产环境 ID）
    prod: 'test-3g3ho1oo318ec768' // TODO: 替换为实际的生产环境 ID
  }
}

/**
 * 获取当前环境 ID
 */
function getCurrentEnvId() {
  const env = ENV_CONFIG.current
  return ENV_CONFIG.envIds[env] || ENV_CONFIG.envIds.dev
}

/**
 * 是否为生产环境
 */
function isProduction() {
  return ENV_CONFIG.current === 'prod'
}

/**
 * 是否为开发环境
 */
function isDevelopment() {
  return ENV_CONFIG.current === 'dev'
}

module.exports = {
  getCurrentEnvId,
  isProduction,
  isDevelopment,
  ENV_CONFIG
}

