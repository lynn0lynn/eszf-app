// 每日运势提醒服务 — 推送通知 + 日历
import * as Notifications from 'expo-notifications';
import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';

// 配置推送行为（前台时）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 请求权限
export async function requestPermissions() {
  const notifResult = await Notifications.requestPermissionsAsync();
  const notif = notifResult.granted;

  let cal = false;
  try {
    const calResult = await Calendar.requestCalendarPermissionsAsync();
    cal = calResult.granted;
  } catch (e) {
    // 某些设备不支持日历
  }

  return { notif, cal };
}

// 每日推送提醒 (7:00 AM)
export async function scheduleDailyNotification() {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '☯ 八字今日运势',
      body: '你的每日流日运势已更新，点击查看今天要注意什么',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: 'daily',
      hour: 7,
      minute: 0,
    },
  });
}

// 创建"八字运势"日历
export async function createFortuneCalendar() {
  try {
    const defaultCalSource = Platform.OS === 'ios'
      ? { isLocalAccount: true, name: 'ESZF' }
      : undefined;

    const calendarId = await Calendar.createCalendarAsync({
      title: '八字运势',
      color: '#667eea',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalSource ? undefined : undefined,
      source: defaultCalSource,
      name: 'eszf-fortune',
      ownerAccount: 'eszf',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    return calendarId;
  } catch (e) {
    console.log('Calendar create error:', e.message);
    return null;
  }
}

// 添加每日日历事件
export async function addDailyCalendarEvent(calendarId) {
  if (!calendarId) return;

  // 明天 7:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 0, 0, 0);

  const endTime = new Date(tomorrow.getTime() + 30 * 60 * 1000);

  try {
    await Calendar.createEventAsync(calendarId, {
      title: '☯ 查看八字今日运势',
      notes: '今日流日运势已更新，打开APP查看详情',
      startDate: tomorrow,
      endDate: endTime,
      alarms: [{ relativeOffset: 0 }], // 准时提醒
      recurrenceRule: { frequency: 'daily', interval: 1 },
    });
  } catch (e) {
    console.log('Calendar event error:', e.message);
  }
}
