/*
useDebounce:
  防抖 + 状态锁 Hooks，用于防止按钮重复点击导致多次提交
  
  功能：
    - 防抖：在指定时间内只执行最后一次调用
    - 状态锁：提交过程中阻止重复执行
    - 自动管理 loading 状态
    - 支持异步函数
    - 自动清理定时器
  
  使用场景：
    - 表单提交
    - 按钮点击
    - API 请求
    - 任何需要防止重复执行的操作
*/

import { ref, onUnmounted } from 'vue';
import { createErrorHandler } from './useErrorHandler.js';
/**
 * 防抖 + 状态锁 Hooks
 * @param {Function} fn - 要防抖的函数（可以是异步函数）
 * @param {Object} options - 配置选项
 * @param {number} options.delay - 防抖延迟时间（毫秒），默认 300ms
 * @param {boolean} options.immediate - 是否立即执行第一次调用，默认 false
 * @param {boolean} options.enableLock - 是否启用状态锁（提交中阻止重复执行），默认 true
 * @param {Function} options.onError - 自定义错误处理器，接收 (error, errorType) => Error
 * @param {boolean} options.silent - 是否静默处理错误（不记录日志），默认 false
 * 
 * @returns {Object} { execute: 执行函数, isSubmitting: 提交状态, loading: 加载状态, cancel: 取消函数 }
 * 
 * @example
 * // 基础用法
 * const { execute, isSubmitting, loading } = useDebounce(async () => {
 *   await submitForm();
 * });
 * 
 * // 自定义配置
 * const { execute, isSubmitting } = useDebounce(handleSubmit, {
 *   delay: 500,
 *   enableLock: true
 * });
 */
export function useDebounce(fn, options={}) {
  const {
    delay = 300,
    immediate = false,
    enableLock = true,
    onError = null,
    silent = false
  } = options;

  // 创建错误处理器
  const handleError = createErrorHandler({
    onError,
    silent,
    context: 'useDebounce'
  });

  // 状态管理
  const isSubmitting = ref(false); // 提交状态锁
  const loading = ref(false); // 加载状态(用于UI显示)
  let timer = null; // 防抖定时器

  /**
   * 执行函数(带防抖和状态锁)
   * @param {...any} args - 传递给原函数的参数
   */
  const execute = async (...args) => {
    // 状态锁: 结果正在提交, 直接返回
    if(enableLock && isSubmitting.value) { return; }

    // 清除之前的定时器
    if(timer){
      clearTimeout(timer);
      timer = null;
    }

    // 立即执行模式
    if(immediate && !isSubmitting.value) {
      return runFn(...args);
    }

    // 防抖: 延迟执行
    timer = setTimeout(()=>{
      runFn(...args);
      timer = null;
    }, delay);
  };

  /**
   * 实际执行函数
   * @param {...any} args - 传递给原函数的参数
   */
  const runFn = async (...args) => {
    // 状态锁: 如果正在提交中, 直接返回
    if(enableLock && isSubmitting.value) { return; }

    // 设置状态锁和加载状态
    if(enableLock){ isSubmitting.value = true; }

    loading.value = true;

    try {
      // 执行原函数
      const result = await fn(...args);
      return result;
    } catch (error) {
      // 使用统一的错误处理函数
      const handledError = handleError(error);
      throw handledError;
    } finally {
      // 重置状态
      if (enableLock) {
        isSubmitting.value = false;
      }
      loading.value = false;
    }
  };

  /**
   * 取消待执行的防抖函数
   */
  const cancel = () => {
    if(timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  onUnmounted(()=>{
    cancel();
  })

  return {
    execute, // 执行函数(带防抖和状态锁)
    isSubmitting, // 提交状态锁(只读)
    loading, // 加载状态(用于UI显示)
    cancel // 取消待执行的防抖函数
  }
}
