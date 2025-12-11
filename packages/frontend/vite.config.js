import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// 引入rollup-plugin-visualizer, 实现打包分析
import { visualizer } from "rollup-plugin-visualizer";

// 新增：按需引入插件
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
  plugins: [
    vue(),
    // 新增：自动导入 API（如 ElMessage）
    AutoImport({
      resolvers: [ElementPlusResolver()],
      // 生成 ESLint 配置文件，解决 ESLint 报错
      eslintrc: {
        enabled: true, // 启用 ESLint 配置生成
        filepath: './.eslintrc-auto-import.json', // 生成的文件路径
        globalsPropValue: true, // 设置为 true 表示这些是全局变量
      },
    }),
    // 新增：自动导入组件
    Components({
      resolvers: [ElementPlusResolver({
        // 优化：只导入样式，不导入所有组件
        importStyle: 'sass', // 使用 sass 而不是 css，可以进一步优化
      })],
    }),

    // 打包分析插件, 生成stats.html文件
    visualizer({
      filename: "dist/stats.html",
      open: false,             // 自动打开浏览器
      gzipSize: true,
      brotliSize: true,
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@blog/common': fileURLToPath(new URL('../common', import.meta.url)) // 配置@blog/common的别名
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  // 生产环境构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,

    // 优化：启用压缩
    minify: 'terser', // 使用 terser 进行更好的压缩, 确保代码压缩时保留哈希计算所需的信息
    terserOptions: {
      compress: {
        drop_console: false, // 生产环境移除 console
        drop_debugger: false, // 移除 debugger
      },
    },
    // 优化：启用 CSS 代码分割
    cssCodeSplit: true,
    // 优化：启用压缩 CSS
    cssMinify: true,
    // 优化：设置 chunk 大小警告限制
    chunkSizeWarningLimit: 1000,
    
    // 配置rollupOptions, 手动分包
    rollupOptions: {
      output: {
        // 手动分包, 把 vditor 这个依赖（以及它的子依赖）打进一个单独的包
        // manualChunks: {
        //   'vditor': ['vditor'], // 把 vditor 这个依赖（以及它的子依赖）打进一个单独的包
        // }
        // 优化：更细粒度的代码分割
        manualChunks: (id) => {
          // 将 node_modules 中的依赖单独打包
          if (id.includes('node_modules')) {
            // Element Plus 单独打包
            if (id.includes('element-plus')) {
              return 'element-plus';
            }
            // Vue 相关单独打包
            if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
              return 'vue-vendor';
            }
            // vditor 单独打包
            if (id.includes('vditor')) {
              return 'vditor';
            }
            // 其他第三方库
            return 'vendor';
          }
        },
        // 优化：优化 chunk 文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      }
    }
  },
  // 优化：预加载优化, 减少首次冷启动和二次预构建等待；保留按需图标加载避免体积膨胀
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'element-plus'],
    exclude: ['@element-plus/icons-vue'], // 排除图标，按需加载
  },
});
