import request from '@/utils/request'

// 概览统计：用于 Dashboard 顶部 KPI + 趋势等
export function getOverview(params = {}) {
  return request({
    url: '/stats/overview',
    method: 'get',
    params
  })
}

// 热门文章统计: 用于 Dashboard
// export function getTopArticles(params ={}) {
//   return request({
//     url: '/stats/top_articles',
//     method: 'get',
//     params
//   })
// }

// 文章聚合统计：列表页使用
export function getArticleStats(params = {}) {
  return request({
    url: '/stats/articles',
    method: 'get',
    params
  })
}

// 单篇文章明细统计
export function getArticleDetailStats(articleId, params = {}) {
  return request({
    url: `/stats/article/${articleId}`,
    method: 'get',
    params
  })
}

// 浏览时长上报：用于 Dashboard 等页面记录实际浏览行为
export function reportBrowsingTime(data) {
  return request({
    url: '/stats/browsing-time',
    method: 'post',
    data
  })
}

// 浏览时长汇总：用于 Dashboard 调试面板展示历史统计
export function getBrowsingTimeSummary(params = {}) {
  return request({
    url: '/stats/browsing-time/summary',
    method: 'get',
    params
  })
}

export const statsApi = {
  getOverview,
  // getTopArticles,
  getArticleStats,
  getArticleDetailStats,
  reportBrowsingTime,
  getBrowsingTimeSummary
}


