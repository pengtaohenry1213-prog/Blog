import winston from 'winston'; // 导入 winston 日志库
import path from 'path'; // 导入 path 模块
import { fileURLToPath } from 'url'; // 导入 fileURLToPath 模块
import dotenv from 'dotenv'; // 导入 dotenv 模块

dotenv.config(); // 加载环境变量

const __filename = fileURLToPath(import.meta.url); // 获取当前文件的 URL
const __dirname = path.dirname(__filename); // 获取当前文件的目录

const logDir = path.join(__dirname, '../logs'); // 获取日志目录

// 创建 Winston 日志记录器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', // 设置日志级别
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // 添加时间戳
    winston.format.errors({ stack: true }), // 添加错误堆栈
    winston.format.splat(), // 添加日志格式化
    winston.format.json() // 添加 JSON 格式化
  ),
  defaultMeta: { service: 'blog-backend' }, // 设置默认元数据
  transports: [
    // 在开发环境下添加控制台输出
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : []),
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), // 设置错误日志文件
      level: 'error' // 设置错误日志级别
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log') // 设置日志文件
    })
  ]
});

// 如果环境不是生产环境，则同时输出到控制台
if (process.env.NODE_ENV !== 'production') { // 如果环境不是生产环境
  logger.add(new winston.transports.Console({ // 添加控制台输出
    format: winston.format.combine(
      winston.format.colorize(), // 颜色化输出
      winston.format.simple() // 简单格式化输出
    )
  }));
} // 如果环境是生产环境，则不输出到控制台

export default logger; // 导出 logger 实例

