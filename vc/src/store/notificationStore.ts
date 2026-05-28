import { create } from 'zustand';

export interface SidebarNotification {
  id: string;
  projectId: string;
  projectName: string;
  ticker: string;
  type: 'milestone' | 'fund_release' | 'revenue_split' | 'friend_spark';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  amountTON?: number;
  amountVC?: number;
}

interface NotificationState {
  notifications: SidebarNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<SidebarNotification, 'id' | 'isRead' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  simulateMilestoneEvent: () => void;
}

const initialNotifications: SidebarNotification[] = [
  {
    id: "notif-1",
    projectId: "spark-3",
    projectName: "TrendBot Pro",
    ticker: "TBP",
    type: "fund_release",
    title: "🚀 $TBP 阶段 4 分配资金自动结算拨付完成",
    description: "开发团队已完成全网自动分配路由机制，120 TON 及 3,000 $VC 尾盘保证金已安全划拨进入流动结算合约底座。",
    timestamp: "2026-05-27T10:14:00Z",
    isRead: false,
    amountTON: 120,
    amountVC: 3000
  },
  {
    id: "notif-2",
    projectId: "spark-1",
    projectName: "OmniSocial Influencer",
    ticker: "OSA",
    type: "milestone",
    title: "✨ OmniSocial 阶段 1 「核心推特交互升级」顺利达成",
    description: "大语言模型动态阅读与自动 Farcaster 智能发布静态代码完成多签中继审核，恭喜该里程碑顺利解禁通航！",
    timestamp: "2026-05-26T18:22:00Z",
    isRead: true
  }
];

export const useNotificationStore = create<NotificationState>((set, get) => {
  return {
    notifications: initialNotifications,
    unreadCount: initialNotifications.filter(n => !n.isRead).length,

    addNotification: (notif) => {
      const newNotif: SidebarNotification = {
        ...notif,
        id: `notif-${Date.now()}`,
        isRead: false,
        timestamp: new Date().toISOString()
      };

      set((state) => {
        const nextList = [newNotif, ...state.notifications];
        return {
          notifications: nextList,
          unreadCount: nextList.filter(n => !n.isRead).length
        };
      });
    },

    markAsRead: (id) => {
      set((state) => {
        const nextList = state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
        return {
          notifications: nextList,
          unreadCount: nextList.filter(n => !n.isRead).length
        };
      });
    },

    markAllAsRead: () => {
      set((state) => {
        const nextList = state.notifications.map(n => ({ ...n, isRead: true }));
        return {
          notifications: nextList,
          unreadCount: 0
        };
      });
    },

    clearAll: () => {
      set({
        notifications: [],
        unreadCount: 0
      });
    },

    simulateMilestoneEvent: () => {
      const projectsPool = [
        {
          id: "spark-1",
          name: "OmniSocial Influencer",
          ticker: "OSA",
          milestones: [
            "全网分配智能合约防重放升级",
            "Tonkeeper 专用订阅支付插件发布",
            "自主 AI 社区投票反馈模块上线"
          ]
        },
        {
          id: "spark-2",
          name: "CodeVibe Auditor",
          ticker: "CVA",
          milestones: [
            "静态数据溢出特征扫描测试通过",
            "大语言模型本地并发微调测试就绪",
            "白帽子公开审查激励池设立完毕"
          ]
        },
        {
          id: "spark-3",
          name: "TrendBot Pro",
          ticker: "TBP",
          milestones: [
            "多链联签分配分流上线",
            "AMM 初始流动性注入自动划账"
          ]
        }
      ];

      const chosenProj = projectsPool[Math.floor(Math.random() * projectsPool.length)];
      const chosenMilestone = chosenProj.milestones[Math.floor(Math.random() * chosenProj.milestones.length)];
      
      const randVal = Math.random();
      
      if (randVal < 0.35) {
        // 1. Milestone Event
        get().addNotification({
          projectId: chosenProj.id,
          projectName: chosenProj.name,
          ticker: chosenProj.ticker,
          type: "milestone",
          title: `🏆 ${chosenProj.name} 新里程碑验证通过`,
          description: `「${chosenMilestone}」通过多签卫士节点联合核数。恭喜项目朝着完全商业化迈出坚实一步！`
        });
      } else if (randVal < 0.65) {
        // 2. Fund Release Event
        const randTon = Math.floor(Math.random() * 150) + 20;
        const randVc = Math.floor(Math.random() * 4000) + 500;
        get().addNotification({
          projectId: chosenProj.id,
          projectName: chosenProj.name,
          ticker: chosenProj.ticker,
          type: "fund_release",
          title: `💰 ${chosenProj.name} 资金池自动释放结算`,
          description: `由于达到既定代码可用阶段，智能托管中心成功释放 ${randTon} TON 及 ${randVc} $VC 并分配给全网星火支持者！`,
          amountTON: randTon,
          amountVC: randVc
        });
      } else {
        // 3. Friend Spark Event
        const friends = ["VibeDev_bc67", "TonyTon", "DegenMaster", "ApeDegen", "LlamaAlpha", "Pavel_TG"];
        const chosenFriend = friends[Math.floor(Math.random() * friends.length)];
        const mockAmount = [5, 10, 15, 20, 50][Math.floor(Math.random() * 5)];
        const isTeam = Math.random() > 0.4;

        get().addNotification({
          projectId: chosenProj.id,
          projectName: chosenProj.name,
          ticker: chosenProj.ticker,
          type: "friend_spark",
          title: isTeam 
            ? `👥 ${chosenFriend} 加入了拼单战队` 
            : `✦ ${chosenFriend} 独立支持了项目`,
          description: isTeam
            ? `您的好友 ${chosenFriend} 刚刚加入了 ${chosenProj.name} 的拼单小组，并支持了 ${mockAmount} TON！`
            : `您的好友 ${chosenFriend} 刚刚为 ${chosenProj.name} 注入了 ${mockAmount} TON 的星火支持！`
        });
      }
    }
  };
});
