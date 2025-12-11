> 性能与安全优化文档

# 性能与安全优化方案

## 一、性能优化
1. **数据库优化**：
   - 索引：articles表（author_id、category_id、publish_time联合索引），users表（username唯一索引）；定期使用 `EXPLAIN` 和 `ANALYZE` 复盘慢查询
   - 分页：基于 limit/offset；热门列表可用 `id < last_id` 方式做游标翻页减少扫描
   - 连接池：控制 max/idle、超时，防止连接耗尽；开启 SQL 慢日志与告警
   - 归档与冷热分离：历史文章定期归档，减少主表体积
   - 备份与恢复演练：mysqldump/物理备份，验证可恢复性

2. **缓存策略**：
   - Redis分级缓存：
     - 一级缓存：热门文章列表（Top 10），5分钟过期
     - 二级缓存：文章详情，1小时过期（更新时主动删除）
   - 缓存预热：**后端启动时加载热门文章至Redis**
   - 缓存雪崩/击穿：错峰过期（加随机 ttl），互斥锁防止击穿，热点自动降级为短 ttl
   - 缓存一致性：写操作先更新DB再删缓存；失败时记录补偿任务
   - 布隆过滤器：拦截不存在的文章ID，减少对DB的空查

3. **前端优化**：
   - 构建：分包与路由懒加载；使用 ESBuild/Vite 预构建依赖；开启 Tree Shaking、压缩（terser+cssnano）
   - 传输：HTTP/2，启用 Gzip/Brotli（静态资源与 API 响应）；图片压缩与 WebP/AVIF
   - 缓存：静态资源带 content hash，Cache-Control immutable；HTML 不缓存
   - 体验：骨架屏与渐进加载，滚动触底分页；首屏关键 CSS 内联
   - 预加载优化：Vite `optimizeDeps` 显式 include `vue`/`vue-router`/`pinia`/`element-plus`，exclude `@element-plus/icons-vue`，减少首次冷启动和二次预构建等待；保留按需图标加载避免体积膨胀
   - Canvas 性能：全局 monkey-patch `HTMLCanvasElement.getContext` 补全 `{ willReadFrequently: true }`（适配 text-image 内部自建 canvas 的频繁 `getImageData`），重绘/resize 侧使用防抖
   - 减少主线程阻塞（优化 TBT）, 对 Canvas 重绘操作添加防抖, 避免在初始化过程中执行过多同步操作
   - IntersectionObserver 懒加载图片, 避免在初始化过程中执行过多同步操作, 视频 canvas 按需加载（如用户滚动到可视区域时才加载）
   - 非关键内容利用空闲时间初始化requestIdleCallback 异步执行耗时操作, 避免阻塞主线程, 比如: 图片处理、视频解码、数据分析、数据统计等
   - 使用动态 import() 延迟加载视频处理库, 避免在初始化过程中执行过多同步操作, 比如: video.js、@sunny-117/text-image等
   - 使用 Web Workers 处理 CPU 密集型任务（如图片处理、视频解码），避免阻塞主线程
   - 避免布局偏移（优化 CLS）, 为 Canvas 和视频设置固定尺寸，避免加载过程中布局跳动, 比如: 固定最大宽度/高度, 最小宽度/高度, 固定宽度/高度为视频容器设置占位尺寸, 或者使用绝对定位
   - 清理资源避免内存泄漏（长期性能）

4. **Nginx增强**：
   - 压缩：Gzip/Brotli 双栈，合理压缩级别，最小长度阈值
   - 缓存：静态资源 1y+immutable；API 按状态码分级缓存，5xx stale 回源
   - 连接：keepalive、tcp_nopush、tcp_nodelay，合理 worker_connections；client_max_body_size 限制
   - 安全：CSP、X-Frame-Options、X-Content-Type-Options、XSS-Protection；限流（limit_req）、连接数限制（limit_conn）
   - 观察性：access_log 采样/分流；upstream 健康检查和超时（connect/read/send）

5. **后端服务（Node/Nuxt）**：
   - 运行时：启用 PM2/cluster 模式，合理实例数；关闭多余的 source map 发布
   - 连接：HTTP Keep-Alive，代理信任；上游超时和重试控制
   - 资源：合理内存上限与 GC 监控；避免同步阻塞，热点接口走缓存或批量化
   - 安全：输入校验（joi/express-validator）、速率限制、CORS 白名单、JWT+RBAC，中间件层面开关

6. **交付与基础设施**：
   - 构建产物：前后端分离制品，CDN 边缘缓存；镜像多阶段构建减小体积
   - 配置：12-Factor，敏感信息用环境变量或密钥管理服务
   - 自动化：CI 持续检查（lint/test/typecheck），预发布环境做冒烟与回归

7. **监控与预警**：
   - 指标：应用 QPS、P95/99 延迟、错误率、队列长度、GC/内存、DB/Redis 连接池、Nginx upstream 状态
   - 日志：结构化日志+trace id，集中收集（ELK/ Loki），采样策略
   - 告警：基于阈值和变化率，区分等级；值班流程与演练

8. **容量与压测**：
   - 定期压测（并发/峰值/大报文），评估瓶颈；预估容量并预留 30% 余量
   - 读写分离与水平扩展预案，限流与降级策略（例如热点接口降级为缓存/静态）

9. **安全补充**：
   - 输入输出：统一编码与转义，防 XSS/SQLi；上传文件类型与大小校验
   - 鉴权：JWT 过期与续签、角色权限校验；高风险接口二次校验
   - 传输：生产强制 HTTPS，HSTS；TLS1.2+
   - 依赖：定期漏洞扫描（npm audit/Dependabot），SCA 与许可审查

## 二、数据安全
1. 密码加密存储（bcrypt）
2. 接口参数校验（joi/express-validator）
3. 基于JWT的Token认证+角色权限控制

