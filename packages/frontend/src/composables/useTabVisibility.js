/*
useTabVisibility:
  useTabVisibility 专门管：当前 tab 是否可见、多 tab 竞争谁是“最活跃”等。
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
 * Hooks: useTabVisibility 专门管：当前 tab 是否可见、多 tab 竞争谁是“最活跃”等。
 * @param {Object} options
 * @param {string} options.componentName 所在组件名称
 * @param {number} options.expiryTime 过期时间（毫秒），默认 5000
 * @param {number} options.cleanupInterval 清理间隔（毫秒），默认 10000
 * @param {boolean} options.enableMultiTab 是否启用多页签通信，默认 true
 * @param {string} options.storageKey localStorage key，默认 '__tab_visibility_state__'
 * @param {Function} options.onActive 页签变为活跃时的回调
 * @param {Function} options.onInactive 页签变为非活跃时的回调
 * 
 * @returns {Object} { isActive, isCurrentTabActive, tabId }
 */
export function useTabVisibility(options = {}) {
  /*
    功能：
      - 监听 document.visibilitychange 事件，检测当前页签的活跃状态
      - 可选启用 localStorage 多页签通信
      - 监听 window.storage 事件，同步其他页签的状态变化
      - 生成唯一页签 ID（使用时间戳 + 随机数）
      - 支持状态变化回调（onActive / onInactive）

    useTabVisibility 流程：
      开始
      ├─ 初始化配置（合并默认与用户参数：过期时间、清理间隔等）
      ├─ 生成唯一tabId（时间戳+随机数）
      ├─ 初始化状态：
      │  ├─ isActive（基于document可见性）
      │  └─ isCurrentTabActive（多页签关则同isActive，开则初始为true）
      ├─ 组件挂载：
      │  ├─ 注册visibilitychange监听（监测当前页签可见性）
      │  ├─ 多页签启用时：
      │  │  ├─ 注册storage监听（同步其他页签变化）
      │  │  ├─ 更新状态到localStorage
      │  │  ├─ 检查当前是否为最活跃页签
      │  │  └─ 启动定时清理任务
      │  └─ 触发初始化回调（强制执行）
      ├─ 事件处理：
      │  ├─ visibilitychange：
      │  │  ├─ 状态不变：多页签更新存储并查活跃性/单页签同步状态
      │  │  ├─ 状态变化：更新isActive，多页签按需写存储并查活跃性
      │  │  └─ 触发onActive/onInactive回调
      │  ├─ storage（其他页签修改存储）：校验key后重查最活跃页签
      │  └─ 定时清理：移除过期非当前页签状态，并重查活跃性
      └─ 组件卸载：
        ├─ 移除visibilitychange和storage监听
        ├─ 清除定时清理器
        └─ 多页签启用时删除localStorage中自身状态
  */

  /*
    “多页签竞争”指的是同一应用被多个浏览器标签页或窗口同时打开时，它们需要协商“谁算作当前真正活跃、能够触发轮询或统计”等行为。
    useTabVisibility 通过 localStorage 通信 + 定期清理的机制，让所有打开的标签页知道最新的“活跃者”，
    避免多个页面同时执行相同任务（比如重复轮询接口、重复统计浏览时长）。
    当某个标签页变为可见，它会把自己的状态写入存储并争取成为“最活跃”页签；
    其他页签接收到存储事件后 会让出“主导权”，从而实现多标签之间的竞争与协作。
  */

  const {
    expiryTime = 5000,
    cleanupInterval = 10*1000, // 默认10s
    enableMultiTab = true,
    storageKey = '__tab_visibility_state__', // 建议调用方使用自己的 storageKey, 如: ‘__tab_xxx_polling__’
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

  // 默认使用 isCurrdentTabActive，保证多开同一页面时只统计一个页签
  // 全局只有“当前被判定为 isCurrentTabActive 的页签”会继续轮询，其它页签（即使也可见）会停掉轮询。
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
    // 有 window 的情况下才会启动；单页签/SSR 都不会跑。
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
    // 有 window 的情况下才会启动；单页签/SSR 都不会跑。
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
   * 判断当前页签 是否是 最活跃的
   * 基于 localStorage 的最新状态重新判断“当前页签是不是最活跃”。这是最关键的逻辑，
   * 因为这是多 tab 通信的核心，决定了“谁说了算”。
   */
  function checkCurrentTabActive() {
    /*
      ┌─────────────────────────────────────────────────────────┐
      │ 开始: checkCurrentTabActive()                            │
      └───────────────────────────┬─────────────────────────────┘
                                  ▼
      ┌─────────────────────────────────────────────────────────┐
      │ 条件1: 未启用多页签通信 或 无window环境?                │
      ├─────────────┬───────────────────────────────────────────┤
      │     是      │ 设isCurrentTabActive = isActive，打印日志 │
      │             │ ──────────────▶ 结束                      │
      │     否      │ 继续下一步                                │
      └─────────────┴───────────────────┬───────────────────────┘
                                        ▼
      ┌─────────────────────────────────────────────────────────┐
      │ 读取localStorage中所有页签状态(allTabsState)             │
      └───────────────────────────┬─────────────────────────────┘
                                  ▼
      ┌─────────────────────────────────────────────────────────┐
      │ 条件2: 无存储的tabId 或 存储tabId等于当前页签tabId?       │
      ├─────────────┬───────────────────────────────────────────┤
      │     是      │ 设isCurrentTabActive = isActive，打印日志 │
      │             │ ──────────────▶ 结束                      │
      │     否      │ 继续下一步                                │
      └─────────────┴───────────────────┬───────────────────────┘
                                        ▼
      ┌─────────────────────────────────────────────────────────┐
      │ 条件3: 存储的页签是活跃状态 且 存储tabId≠当前tabId?     │
      ├─────────────┬───────────────────────────────────────────┤
      │     是      │ 设isCurrentTabActive = false，打印日志    │
      │     否      │ 设isCurrentTabActive = isActive，打印日志 │
      └─────────────┴───────────────────┬───────────────────────┘
                                        ▼
      ┌─────────────────────────────────────────────────────────┐
      │ 补充日志: 若当前页签不活跃/非最活跃，打印错误日志        │
      └─────────────────────────────────────────────────────────┘
                                  ▼
                              流程结束

    */

    // 如果未启用多页签通信，或者没有 window，则当前页签是活跃的
    // 有 window 的情况下才会启动；单页签/SSR 都不会跑。
    if (!enableMultiTab || !hasWindow) {
      // !hasWindow: 单页签/SSR 都不会跑, 所以 isCurrentTabActive 直接用 isActive 即可。
      isCurrentTabActive.value = isActive.value;
      console.log('[判断当前页签是否是最活跃的] single-tab', {
        isActive: isActive.value,
        isCurrentTabActive: isCurrentTabActive.value,
      });
      return;
    }

    // 读取所有页签状态
    const allTabsState = getAllTabsState();
    // 如果没有其他页签的状态(没有tabId)，或者当前页签就是存储的页签(tabId==tabId)，则当前页签是活跃的
    if (!allTabsState.tabId || allTabsState.tabId === tabId.value) {
      isCurrentTabActive.value = isActive.value;
      console.warn('如果没有其他页签的状态(没有tabId)，或者当前页签就是存储的页签(tabId==tabId)，则当前页签是活跃的: ', {
        isActive: isActive.value,
        isCurrentTabActive: isCurrentTabActive.value,
        storage: allTabsState,
      });
      return;
    }

    // 如果其他页签是活跃的，且时间戳较新，则当前页签不是最活跃的
    if (allTabsState.isActive && allTabsState.tabId !== tabId.value) {
      isCurrentTabActive.value = false;
      console.warn('如果其他页签是活跃的，且时间戳较新，则当前页签不是最活跃的: ', {
        isActive: isActive.value,
        isCurrentTabActive: isCurrentTabActive.value,
        storage: allTabsState,
      });
      console.warn('[checkCurrentTabActive] 当前页签不是最活跃的');
    } else {
      // 其他页签不活跃，或者当前页签就是存储的页签，则当前页签是活跃的
      isCurrentTabActive.value = isActive.value;
      console.warn('其他页签不活跃，或者当前页签就是存储的页签，则当前页签是活跃的: ', {
        isActive: isActive.value,
        isCurrentTabActive: isCurrentTabActive.value,
        storage: allTabsState,
      });
    }

    if(!isActive.value) {
      console.error('当前页签不活跃!');
    }
    if(!isCurrentTabActive.value) {
      console.error('当前页签不是所有页签中活跃的!');
    }
  }

  /**
   * 清理过期的页签状态, 把 localStorage 里已经过期、且不是当前 tab 的记录清掉
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
    const nextState = hasDocument ? document.visibilityState === 'visible' : true;
    const previousState = isActive.value;

    // 如果状态没有变化，则更新 localStorage 并检查当前页签是否是最活跃的
    if (previousState === nextState) {
      // 如果启用了多页签通信，则更新 localStorage 并检查当前页签是否是最活跃的
      if (enableMultiTab) {
        // 更新 localStorage
        updateLocalStorage();

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

    // 如果其他页签更新了状态，重新检查当前页签是否是最活跃的
    checkCurrentTabActive();
  }

  /**
   * 初始化
   */
  function init() {
    if (!hasWindow || !hasDocument) return;

    // 组合式里
    const { componentName = 'unknown' } = options;
    console.error(`组件 ${componentName} 挂载时初始化 -> init()`);

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
      // console.error('[init] if (enableMultiTab) { updateLocalStorage()');
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
        // console.error('[init] cleanupTimer = setInterval(() => { -> checkCurrentTabActive()');
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
 * Hooks: useAutoPolling 根据某个布尔状态（这里就是 isActive）来 启停轮询。
 * 功能: 自动轮询工具，结合页签活跃状态自动暂停/恢复 [根据options -> 自动轮询 poller函数 执行]
 * @param {Function} poller 轮询任务函数（可返回 Promise）
 * @param {Object} options
 * @param {number} options.interval 轮询间隔（默认 30000 毫秒）
 * @param {boolean} options.immediate 是否在开始时立即执行一次任务
 * @param {boolean} options.autoStart 是否根据页签状态自动启动
 * @param {Object} options.visibilityOptions 传递给 useTabVisibility 的配置
 * 
 * 如果以后你想在某个页面“只看自己 tab 是否可见，不参与竞争”，可以在该页面传：
 *  visibilityOptions: {
 *    useCurrentTabActive: false
 *  }
 */
export function useAutoPolling(poller, options = {}) {
  /*
    useAutoPolling 详细流程：
      开始
      ├─ 初始化-配置
      │  ├─ 轮询间隔(默认30000ms)/立即执行/自动启动
      │  └─ 页签配置(传递给useTabVisibility)
      ├─ 初始化-状态
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
  */

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

  // useAutoPolling 之所以内部调用 useTabVisibility，是为了拿到这个组件对应的 “页签是否活跃” 状态，
  // 从而在标签页不可见时自动暂停轮询，在标签页恢复时再自动恢复。
  // 这是一种标准的 composable 组合用法，它们之间是“依赖关系 + 联动”的。
  // 两个 composable 共用的是同一套生命周期（这个组件的 onMounted/onUnmounted），但各自维护自己的 ref、定时器、监听：
  //  - useTabVisibility 返回 isActive / isCurrentTabActive / tabId。
  //  - useAutoPolling 默认使用 isCurrentTabActive（多标签只保留一个“主轮询者”），
  //    若业务希望“每个可见页签各自轮询”，可在 visibilityOptions 里传入 useCurrentTabActive: false。
  const {
    useCurrentTabActive = true,
    ...tabVisibilityOptions
  } = visibilityOptions || {};

  // 把 useAutoPolling 改成默认用 isCurrentTabActive 控制轮询，这样多页签/多窗口里同一时刻只会有一个“主轮询者”。
  // 同一时间只让一个最活跃页签负责轮询，避免多页签重复轮询。
  const { isActive, isCurrentTabActive } = useTabVisibility(tabVisibilityOptions);
  const activeRef = useCurrentTabActive ? isCurrentTabActive : isActive;

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

    // 启动/监听都基于 activeRef
    if (!activeRef.value) return;

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
   * 监听页签状态变化, 启动/监听都基于 activeRef
   */
  watch(
    activeRef,
    (active) => {
      // 非浏览器环境 
      if (!canUseWindow) return;
      if (!active) {
        console.error('[watch 监听页签状态变化] isActive -> ', active, ' -> stop()');
        stop(); // 页签不活跃 -> 停止 setInterval
        return;
      }
      if (shouldResume && !isRunning.value) {
        start(); // 恢复活跃 -> 重新启动轮询
      }
    },
    { immediate: autoStart }
  );

  onUnmounted(() => {
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

  // 默认使用 isCurrdentTabActive，保证多开同一页面时只统计一个页签
  // 全局只有“当前被判定为 isCurrentTabActive 的页签”会继续轮询，其它页签（即使也可见）会停掉轮询。
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
