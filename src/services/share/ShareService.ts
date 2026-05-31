import type { CalendarEvent, ShareLink } from '@/types';
import type { ICalendarService } from '@/services/calendar/ICalendarService';
import type { INotificationService } from '@/services/notification/INotificationService';
import type { IShareLinksRepository } from '@/repositories/shareLinks/IShareLinksRepository';

// =====================================================================
// 「予定の共有処理」フローの一元化（要件 5 のシーケンス）。
//   6. 共有カレンダーに予定をコピー
//   7. share_links に対応関係を保存（重複作成防止）
//   8. 彼氏に通知
// レベッカの予定を共有カレンダーにコピーする処理を、UI から切り離す。
// =====================================================================
export class ShareService {
  constructor(
    private calendar: ICalendarService,
    private shareLinks: IShareLinksRepository,
    private notifications: INotificationService,
  ) {}

  isShared(sourceGoogleEventId: string | null): boolean {
    if (!sourceGoogleEventId) return false;
    return !!this.shareLinks.findActiveBySource(sourceGoogleEventId);
  }

  /** レベッカの予定を共有カレンダーへコピー（重複防止つき）。 */
  async shareEvent(params: {
    sharedCalendarId: string;
    source: CalendarEvent;
    byUserId: string;
  }): Promise<void> {
    const { sharedCalendarId, source, byUserId } = params;
    const sourceEventId = source.sourceGoogleEventId ?? source.appEventId;

    // 重複作成防止: 既に active な share_link があれば何もしない。
    if (this.shareLinks.findActiveBySource(sourceEventId)) return;

    const copy = await this.calendar.copyEventToShared({ sharedCalendarId, source, byUserId });

    const link: ShareLink = {
      id: `link-${sourceEventId}`,
      sourceGoogleCalendarId: source.sourceGoogleCalendarId ?? '',
      sourceGoogleEventId: sourceEventId,
      sharedGoogleCalendarId: sharedCalendarId,
      sharedGoogleEventId: copy.sharedGoogleEventId ?? copy.appEventId,
      sharedBy: byUserId,
      sharedAt: new Date().toISOString(),
      unsharedAt: null,
      status: 'active',
    };
    await this.shareLinks.upsert(link);

    // 共有を通知。
    await this.notifications.notify({
      kind: 'event_shared',
      title: '新しい共有予定',
      body: `「${source.title}」が共有されました`,
    });
  }

  /** 共有解除: 共有カレンダー側コピーを削除し、share_link を removed に。 */
  async unshareEvent(sourceGoogleEventId: string): Promise<void> {
    const link = this.shareLinks.findActiveBySource(sourceGoogleEventId);
    if (!link) return;
    await this.calendar.removeSharedEvent(link.sharedGoogleCalendarId, link.sharedGoogleEventId);
    await this.shareLinks.markRemoved(link.id);
  }
}
