import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * 浏览时长统计表
 * 用于记录各类页面（如后台 Dashboard）的实际浏览行为
 */
class BrowsingStat extends Model {}

BrowsingStat.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    // 可选的用户 ID（未登录时可以为 null）
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    // 页面标识，如 'admin-dashboard'
    page: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    // 累计浏览时长（秒）
    total_time: {
      type: DataTypes.FLOAT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    // 本次会话浏览时长（秒）
    session_time: {
      type: DataTypes.FLOAT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    // 本次上报时前端是否还在统计中
    is_tracking: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // 上报原因：periodic / unload 等
    reason: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    // 前端生成的上报时间（ISO 字符串）
    reported_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // 额外信息：UA、IP，方便后续分析
    user_agent: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'BrowsingStat',
    tableName: 'browsing_stats',
    underscored: true,
    timestamps: true
  }
);

export default BrowsingStat;


