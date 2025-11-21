> 性能与安全优化文档

# 性能与安全优化方案

## 一、性能优化
1. **数据库优化**：
   - MySQL索引：articles表（author_id、category_id、publish_time联合索引）、users表（username唯一索引）
   - 分页查询：基于limit和offset实现，前端滚动触底加载

2. **缓存策略**：
   - Redis分级缓存：
     - 一级缓存：热门文章列表（Top 10），5分钟过期
     - 二级缓存：文章详情，1小时过期（更新时主动删除）
   - 缓存预热：后端启动时加载热门文章至Redis

3. **前端优化**：
   - 路由懒加载
   - 静态资源缓存（Nginx配置Cache-Control）

4. **Nginx增强**：
   - Gzip压缩（静态资源+API响应）
   - 静态资源长缓存

## 二、数据安全
1. 密码加密存储（bcrypt）
2. 接口参数校验（joi/express-validator）
3. 基于JWT的Token认证+角色权限控制

