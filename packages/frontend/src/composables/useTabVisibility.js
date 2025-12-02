/*
useTabVisibility:
  开始 → 初始化配置/生成tabId → 设初始状态
  挂载 → 注册事件监听
    ├─ visibilitychange → 更新状态 → 处理回调
    ├─ storage事件 → 检查活跃性 [window.addEventListener('storage', (e)=>{ ... }); 监听其他页签的活跃状态变化]
    └─ 定时清理过期状态
  卸载 → 移除监听/清理存储

useAutoPolling:
  开始 → 校验参数/初始化配置
    ├─ 页签活跃 → start() → 定时执行任务 [setInterval -> execute()]
    ├─────────── execute() [await poller()] 
    └─ 页签不活跃 → stop() → 清空定时执行任务 [clearInterval(timerId)]
  卸载 → 强制停止

useBrowsingTime:
  开始 → 初始化状态
    ├─ 页签活跃 → 开始计时
    └─ 页签不活跃 → 停止计时并累加
  卸载 → 停止计时
*/

import { ref, onMounted, onUnmounted, watch } from 'vue';

/**
 * useTabVisibility 详细流程：
    开始
    ├─ 初始化配置（合并默认值与用户参数）
    │  ├─ 过期时间/清理间隔/多页签开关/storageKey
    │  └─ 回调函数(onActive/onInactive)
    ├─ 生成唯一tabId（时间戳+随机数）
    ├─ 初始化状态
    │  ├─ isActive（基于document.visibilityState）
    │  └─ isCurrentTabActive（多页签关则=isActive，开则=true）
    ├─ 组件挂载(onMounted)
    │  ├─ 注册visibilitychange监听
    │  │  └─ 监听页签可见性变化
    │  ├─ 若启用多页签通信：
    │  │  ├─ 注册storage事件监听（同步其他页签变化）
    │  │  ├─ 更新当前状态到localStorage
    │  │  ├─ 检查当前是否为最活跃页签(checkCurrentTabActive)
    │  │  └─ 启动定时清理(cleanupExpiredTabs)
    │  └─ 触发初始化回调（force=true）
    ├─ 事件处理
    │  ├─ visibilitychange事件
    │  │  ├─ 计算nextState（可见性状态）
    │  │  ├─ 状态无变化：
    │  │  │  ├─ 多页签开：更新localStorage+检查活跃性
    │  │  │  └─ 多页签关：同步isCurrentTabActive
    │  │  ├─ 状态有变化：
    │  │  │  ├─ 更新isActive为nextState
    │  │  │  ├─ 多页签开：
    │  │  │  │  ├─ 符合条件时写入localStorage（可见/当前记录是自己）
    │  │  │  │  └─ 检查当前是否为最活跃
    │  │  │  └─ 多页签关：同步isCurrentTabActive
    │  │  └─ 触发onActive/onInactive回调
    │  ├─ storage事件（其他页签修改localStorage）
    │  │  ├─ 校验storageKey匹配
    │  │  └─ 重新检查当前是否为最活跃页签
    │  └─ 定时清理任务
    │     ├─ 读取localStorage状态
    │     ├─ 移除过期且非当前页签的状态
    │     └─ 重新检查活跃性
    └─ 组件卸载(onUnmounted)
      ├─ 移除visibilitychange/storage监听
      ├─ 清除定时清理器
      └─ 多页签开：移除localStorage中当前页签状态
 * 页签活跃状态管理 Composable
 *
 * 功能：
 * - 监听 document.visibilitychange 事件，检测当前页签的活跃状态
 * - 可选启用 localStorage 多页签通信
 * - 监听 window.storage 事件，同步其他页签的状态变化
 * - 生成唯一页签 ID（使用时间戳 + 随机数）
 * - 支持状态变化回调（onActive / onInactive）
 *
 * @param {Object} options
 * @param {number} options.expiryTime 过期时间（毫秒），默认 5000
 * @param {number} options.cleanupInterval 清理间隔（毫秒），默认 10000
 * @param {boolean} options.enableMultiTab 是否启用多页签通信，默认 true
 * @param {string} options.storageKey localStorage key，默认 '__tab_visibility_state__'
 * @param {Function} options.onActive 页签变为活跃时的回调
 * @param {Function} options.onInactive 页签变为非活跃时的回调
 * @returns {Object} { isActive, isCurrentTabActive, tabId }
 */
export function useTabVisibility(options = {}) {
  const {
    expiryTime = 5000,
    cleanupInterval = 10000,
    enableMultiTab = true,
    storageKey = '__tab_visibility_state__',
    onActive,
    onInactive
  } = options;

  const hasDocument = typeof document !== 'undefined'; // 是否有浏览器端的Document
  const hasWindow = typeof window !== 'undefined'; // 是否有浏览器端的window

  // 当前页签的唯一 ID
  const tabId = ref(generateTabId());
  // 当前页签是否活跃（基于 visibilitychange）
  const initialVisibility = hasDocument ? document.visibilityState === 'visible' : true;
  console.warn('document.visibilityState: ',document.visibilityState)
  const isActive = ref(initialVisibility);
  // 当前页签 是否是 所有页签中活跃的（基于 localStorage 通信）
  const isCurrentTabActive = ref(enableMultiTab ? true : initialVisibility);

  // 清理定时器 & 事件监听器
  let cleanupTimer = null;
  let visibilityHandler = null;
  let storageHandler = null;

  /**
   * 生成唯一页签 ID
   */
  function generateTabId() {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 更新当前页签状态到 localStorage
   */
  function updateLocalStorage() {
    if (!enableMultiTab || !hasWindow) return;

    try {
      // 创建状态对象
      const state = {
        tabId: tabId.value,
        isActive: isActive.value,
        timestamp: Date.now()
      };
      // 更新 localStorage
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to update localStorage:', error);
    }
  }

  /**
   * 从 localStorage 读取所有页签状态
   */
  function getAllTabsState() {
    if (!enableMultiTab || !hasWindow) return {};

    try {
      // 读取 localStorage
      const stateStr = localStorage.getItem(storageKey);
      if (!stateStr) return {};

      const state = JSON.parse(stateStr);
      // 检查是否过期
      const now = Date.now();
      if (now - state.timestamp > expiryTime) {
        // 过期了，清除
        localStorage.removeItem(storageKey);
        return {};
      }

      return state;
    } catch (error) {
      console.warn('Failed to read localStorage:', error);
      return {};
    }
  }

  /**
   * 判断当前页签是否是最活跃的
   */
  function checkCurrentTabActive() {
    // 如果未启用多页签通信，或者没有 window，则当前页签是活跃的
    if (!enableMultiTab || !hasWindow) {
      isCurrentTabActive.value = isActive.value;
      console.error('[function checkCurrentTabActive] single-tab', {
        isActive: isActive.value,
        isCurrentTabActive: isCurrentTabActive.value,
      });
      return;
    }

    // 读取所有页签状态
    const allTabsState = getAllTabsState();
    
    // 如果没有其他页签的状态，或者当前页签就是存储的页签，则当前页签是活跃的
    if (!allTabsState.tabId || allTabsState.tabId === tabId.value) {
      isCurrentTabActive.value = isActive.value;
      console.warn('[checkCurrentTabActive] self-or-empty', {
        isActive: isActive.value,
        isCurrentTabActive: isCurrentTabActive.value,
        storage: allTabsState,
      });
      return;
    }

    // 如果其他页签是活跃的，且时间戳较新，则当前页签不是最活跃的
    if (allTabsState.isActive && allTabsState.tabId !== tabId.value) {
      isCurrentTabActive.value = false;
      console.warn('[checkCurrentTabActive] other-active', {
        isActive: isActive.value,
        isCurrentTabActive: isCurrentTabActive.value,
        storage: allTabsState,
      });
      console.warn('[checkCurrentTabActive] 当前页签不是最活跃的');
    } else {
      // 其他页签不活跃，或者当前页签就是存储的页签，则当前页签是活跃的
      isCurrentTabActive.value = isActive.value;
      console.warn('[checkCurrentTabActive] other-inactive', {
        isActive: isActive.value,
        isCurrentTabActive: isCurrentTabActive.value,
        storage: allTabsState,
      });
    }

    if(!isActive.value) {
      console.error('[function checkCurrentTabActive] isActive.value = false 当前页签不活跃!');
    }
    if(!isCurrentTabActive.value) {
      console.error('[function checkCurrentTabActive] isCurrentTabActive.value = false 当前页签不是所有页签中活跃的!');
    }
  }

  /**
   * 清理过期的页签状态
   */
  function cleanupExpiredTabs() {
    if (!enableMultiTab || !hasWindow) return;

    try {
      const stateStr = localStorage.getItem(storageKey);
      if (!stateStr) return;

      const state = JSON.parse(stateStr);
      const now = Date.now();

      // 如果存储的状态过期了，且不是当前页签的，清除它
      if (now - state.timestamp > expiryTime && state.tabId !== tabId.value) {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn('Failed to cleanup expired tabs:', error);
    }
  }

  /**
   * 触发状态变化回调
   */
  function triggerVisibilityCallbacks(nextState, prevState, { force = false } = {}) {
    // 如果不需要强制触发回调，且状态没有变化，则不触发回调
    if (!force && nextState === prevState) {
      return;
    }

    // 如果状态是活跃的，且有回调函数，则触发回调
    if (nextState && typeof onActive === 'function') {
      onActive();
    }

    // 如果状态是非活跃的，且有回调函数，则触发回调
    if (!nextState && typeof onInactive === 'function') {
      onInactive();
    }
  }

  /**
   * 处理 visibilitychange 事件
   */
  function handleVisibilityChange() {
    console.warn('[handleVisibilityChange] 处理 visibilitychange 事件: document.visibilityState =', document.visibilityState);
    const nextState = hasDocument ? document.visibilityState === 'visible' : true;
    const previousState = isActive.value;

    // 如果状态没有变化，则更新 localStorage 并检查当前页签是否是最活跃的
    if (previousState === nextState) {
      // 如果启用了多页签通信，则更新 localStorage 并检查当前页签是否是最活跃的
      if (enableMultiTab) {
        // 更新 localStorage
        updateLocalStorage();

        console.error('[handleVisibilityChange] if (previousState === nextState) { updateLocalStorage()');
        // 检查当前页签是否是最活跃的
        checkCurrentTabActive();
      } else {
        // 如果没有启用多页签通信，则当前页签的状态就是活跃的
        isCurrentTabActive.value = nextState;
      }
      return;
    }

    // 1. 先更新自身可见状态
    isActive.value = nextState;

    // 如果启用了多页签通信，则更新 localStorage 并检查当前页签是否是最活跃的
    if (enableMultiTab) {
      // 2. 读取当前 localStorage 里记录的是谁
      const current = getAllTabsState();
  
      // 3. 决定这次是否要写入 localStorage
      const shouldWrite =
        // 情况一：当前变为可见（visible），一定要覆盖，宣告“我现在是活跃 tab”
        nextState === true ||
        // 情况二：当前变为 hidden，但 localStorage 里还记录的是自己，负责把自己标记为不活跃
        !current.tabId ||
        current.tabId === tabId.value;
  
      if (shouldWrite) {
        updateLocalStorage();
      }
      
      // 4. 再根据最新的 storage 状态更新 isCurrentTabActive
      checkCurrentTabActive();

      console.error('[handleVisibilityChange] if (enableMultiTab) { updateLocalStorage()');
    } else {
      // 未启用多页签通信时，本 tab 的可见状态就是唯一依据
      isCurrentTabActive.value = nextState;
    }

    // 5. 触发回调, 触发状态变化回调
    triggerVisibilityCallbacks(nextState, previousState);
  }

  /**
   * 处理 storage 事件（其他页签的 localStorage 变化）
   */
  function handleStorageChange(event) {
    // 如果未启用多页签通信，则不处理
    if (!enableMultiTab) return;
    // 如果事件的 key 不是 storageKey，则不处理
    if (event.key !== storageKey) return;

    console.error('[handleStorageChange] 处理 storage 事件（其他页签的 localStorage 变化） checkCurrentTabActive(),  event.key =', event.key);
    // 如果其他页签更新了状态，重新检查当前页签是否是最活跃的
    checkCurrentTabActive();
  }

  /**
   * 初始化
   */
  function init() {
    if (!hasWindow || !hasDocument) return;

    // 保存事件处理函数的引用，以便后续清理
    visibilityHandler = handleVisibilityChange;
    // 监听当前页签的 visibilitychange 事件
    document.addEventListener('visibilitychange', visibilityHandler);

    // 监听其他页签的 localStorage 变化
    if (enableMultiTab) {
      // 保存事件处理函数的引用，以便后续清理
      storageHandler = handleStorageChange;
      // 监听其他页签的 localStorage 变化
      window.addEventListener('storage', storageHandler);
    }

    // 监听当前页签的 visibilitychange 事件
    if (enableMultiTab) {
      console.error('[init] if (enableMultiTab) { updateLocalStorage()');
      // 更新当前页签状态到 localStorage
      updateLocalStorage();
      // 检查当前页签是否是最活跃的
      checkCurrentTabActive();

      // 定期清理过期的页签状态
      cleanupTimer = setInterval(() => {
        // 清理过期的页签状态
        cleanupExpiredTabs();
        // 检查当前页签是否是最活跃的
        checkCurrentTabActive();
        console.error('[init] 定期清理过期的页签状态 -> checkCurrentTabActive()');
      }, cleanupInterval);
    } else {
      // 如果没有启用多页签通信，则当前页签的状态就是活跃的
      isCurrentTabActive.value = isActive.value;
    }

    // 初始化时触发一次回调，方便外部感知当前状态
    if (typeof onActive === 'function' || typeof onInactive === 'function') {
      triggerVisibilityCallbacks(isActive.value, !isActive.value, { force: true });
    }
  }

  /**
   * 清理资源
   */
  function cleanup() {
    if (!hasWindow || !hasDocument) return;

    // 移除事件监听器
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }

    // 移除storage
    if (storageHandler) {
      window.removeEventListener('storage', storageHandler);
      storageHandler = null;
    }

    // 清除定时器
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }

    // 清理 localStorage（如果是当前页签存储的）
    if (enableMultiTab) {
      try {
        const stateStr = localStorage.getItem(storageKey);
        if (stateStr) {
          const state = JSON.parse(stateStr);
          if (state.tabId === tabId.value) {
            localStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.warn('Failed to cleanup localStorage:', error);
      }
    }
  }

  // 组件挂载时初始化
  onMounted(() => {
    init();
  });

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup();
  });

  return {
    /**
     * 当前页签是否可见（基于 visibilitychange）
     */
    isActive,
    /**
     * 当前页签是否是所有页签中最活跃的（基于多页签通信）
     */
    isCurrentTabActive,
    /**
     * 当前页签的唯一 ID
     */
    tabId
  };
}

/**
 * useAutoPolling 详细流程：
    开始
    ├─ 校验参数（poller必须为函数）
    ├─ 初始化配置
    │  ├─ 轮询间隔(默认30000ms)/立即执行/自动启动
    │  └─ 页签配置(传递给useTabVisibility)
    ├─ 初始化状态
    │  ├─ isRunning（轮询中）/isExecuting（任务执行中）
    │  └─ shouldResume（是否需恢复轮询，默认=autoStart）
    ├─ 依赖useTabVisibility获取isActive（页签活跃状态）
    ├─ 监听isActive变化
    │  ├─ 变为false（页签不活跃）→ 调用stop()
    │  │  ├─ 清除定时器
    │  │  └─ 标记isRunning=false
    │  └─ 变为true（页签活跃）
    │     └─ 若shouldResume且未轮询 → 调用start()
    ├─ start()逻辑
    │  ├─ 校验：浏览器环境/未运行/间隔合法/页签活跃
    │  ├─ 若immediate=true → 立即执行poller
    │  ├─ 启动定时器（按间隔执行poller）
    │  └─ 标记 isRunning=true
    ├─ stop()逻辑
    │  ├─ 清除定时器
    │  ├─ 若 forceDisable=true → 标记 shouldResume=false
    │  └─ 标记 isRunning=false
    ├─ execute()逻辑（执行轮询任务）
    │  ├─ 若任务执行中 → 直接返回
    │  ├─ 标记isExecuting=true
    │  ├─ 执行poller（支持Promise）
    │  └─ 任务结束 → 标记isExecuting=false
    └─ 组件卸载 → 调用stop(true)（强制停止+禁用自动恢复）
 * 自动轮询工具，结合页签活跃状态自动暂停/恢复 [根据options -> 自动轮询 poller函数 执行]
 * @param {Function} poller 轮询任务函数（可返回 Promise）
 * @param {Object} options
 * @param {number} options.interval 轮询间隔（默认 30000 毫秒）
 * @param {boolean} options.immediate 是否在开始时立即执行一次任务
 * @param {boolean} options.autoStart 是否根据页签状态自动启动
 * @param {Object} options.visibilityOptions 传递给 useTabVisibility 的配置
 */
export function useAutoPolling(poller, options = {}) {
  if (typeof poller !== 'function') {
    throw new Error('useAutoPolling requires a polling function with poller param.');
  }

  const {
    interval = 30000,
    immediate = false,
    autoStart = true,
    visibilityOptions = {}
  } = options;

  const canUseWindow = typeof window !== 'undefined';
  const isRunning = ref(false);
  const isExecuting = ref(false);
  let timerId = null;
  let shouldResume = autoStart; // 是否自动启动，默认自动启动

  console.warn(`useAutoPolling -> useTabVisibility(${JSON.stringify(visibilityOptions)})`);
  
  const { isActive } = useTabVisibility(visibilityOptions);

  /**
   * 执行轮询任务
   */
  async function execute() {
    // 如果正在执行, 则return;
    if (isExecuting.value) return;
    isExecuting.value = true;
    try {
      await poller();
    } catch (error) {
      console.error('Auto polling task failed:', error);
    } finally {
      isExecuting.value = false;
    }
  }

  /**
   * 启动轮询
   */
  function start() {
    shouldResume = true;
    if (!canUseWindow || isRunning.value || interval <= 0) return;
    if (!isActive.value) return;

    if (immediate) {
      execute();
    }

    timerId = setInterval(() => {
      execute();
    }, interval);
    isRunning.value = true;
  }

  /**
   * 停止轮询
   */
  function stop(forceDisable = false) {
    if (!canUseWindow) return;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    isRunning.value = false;
    if (forceDisable) {
      shouldResume = false;
    }
  }

  /**
   * 监听页签状态变化
   */
  watch(
    isActive,
    (active) => {
      // 非浏览器环境 
      if (!canUseWindow) return;
      if (!active) {
        console.error('[watch 监听页签状态变化] isActive -> ', active, ' -> stop()');
        stop();
        return;
      }
      if (shouldResume && !isRunning.value) {
        start();
      }
    },
    { immediate: autoStart }
  );

  onUnmounted(() => {
    console.error('[onUnmounted] stop(true)');
    stop(true);
  });

  return {
    start,
    stop,
    isRunning
  };
}

/**
 * useBrowsingTime 详细流程：
    开始
    ├─ 初始化配置
    │  ├─ autoStart（默认true，按页签状态自动启停）
    │  └─ 页签配置(传递给useTabVisibility)
    ├─ 初始化状态
    │  ├─ totalTime（总时长，秒）/sessionTime（会话时长，秒）
    │  ├─ isTracking（统计中）
    │  └─ sessionStart（会话开始时间戳）
    ├─ 依赖useTabVisibility获取isActive
    ├─ 若autoStart=true
    │  └─ 监听isActive变化
    │     ├─ 变为true → 调用startTracking()
    │     │  └─ 记录sessionStart+标记isTracking=true
    │     └─ 变为false → 调用stopTracking()
    │        ├─ 计算耗时（当前时间-sessionStart）
    │        ├─ 累加至totalTime和sessionTime
    │        └─ 重置sessionStart+标记isTracking=false
    ├─ 辅助方法
    │  ├─ resetSession()
    │  │  ├─ sessionTime置0
    │  │  └─ 若统计中 → 重新记录sessionStart
    │  └─ startTracking()/stopTracking()（同上述逻辑）
    └─ 组件卸载 → 调用stopTracking()（确保最后时长被统计）
    
 * 浏览时长统计
 * @param {Object} options
 * @param {boolean} options.autoStart 根据页签状态自动开始/暂停
 * @param {Object} options.visibilityOptions 传递给 useTabVisibility 的配置：
 *  * - 可使用 useTabVisibility 的全部配置（expiryTime/cleanupInterval/enableMultiTab/storageKey/onActive/onInactive）
 *  * - 额外支持 useCurrentTabActive（默认 true）：
 *  *     - true：基于 isCurrentTabActive 统计，保证多页签场景下同一时间只统计一个活跃页签
 *  *     - false：仅基于当前页签可见性 isActive 统计
 */
export function useBrowsingTime(options = {}) {
  const {
    autoStart = true,
    visibilityOptions = {}
  } = options;

  const canTrack = typeof window !== 'undefined';
  const totalTime = ref(0);
  const sessionTime = ref(0);
  const isTracking = ref(false);
  let sessionStart = null;

  // 同时拿到 isActive（当前页签可见）与 isCurrentTabActive（多页签中最活跃）
  const { isActive, isCurrentTabActive } = useTabVisibility(visibilityOptions);

  // 默认使用 isCurrentTabActive，保证多开同一页面时只统计一个页签
  // 若业务希望“每个可见页签各自统计”，可在 visibilityOptions 中显式传入 useCurrentTabActive: false
  const activeRef =
    visibilityOptions && visibilityOptions.useCurrentTabActive === false
      ? isActive
      : isCurrentTabActive;

  function startTracking() {
    if (!canTrack || isTracking.value) return;
    sessionStart = Date.now();
    isTracking.value = true;
  }

  function stopTracking() {
    if (!canTrack || !isTracking.value) return;
    const elapsed = Math.max(0, Date.now() - sessionStart) / 1000;
    totalTime.value += elapsed;
    console.log('========== totalTime.value : ', totalTime.value)
    sessionTime.value += elapsed;
    sessionStart = null;
    isTracking.value = false;
  }

  function resetSession() {
    sessionTime.value = 0;
    if (isTracking.value) {
      sessionStart = Date.now();
    }
  }

  if (autoStart) {
    watch(
      activeRef,
      (active) => {
        if (active) {
          startTracking();
        } else {
          stopTracking();
        }
      },
      { immediate: true }
    );
  }

  onUnmounted(() => {
    stopTracking();
  });

  return {
    totalTime,
    sessionTime,
    startTracking,
    stopTracking,
    resetSession,
    isTracking
  };
}
