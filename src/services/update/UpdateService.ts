import { registerSW } from 'virtual:pwa-register';
import { APP_CONFIG } from '@/config/appConfig';
import type { AppVersion } from '@/types';

// =====================================================================
// 8. PWAのアップデート確認処理。
//   - Service Worker 登録、waiting 検知、skipWaiting、controllerchange リロード
//   - 起動時/復帰時/定期のバージョンチェック
//   - DB(app_versions) と比較した強制更新判定
// MVP では app_versions はモック（現行と同一）を返す。
// =====================================================================
export interface UpdateState {
  /** 新しい SW が待機中で、更新可能。 */
  updateAvailable: boolean;
  /** app_versions と比較して強制更新が必要。 */
  requiredUpdate: boolean;
  currentVersion: string;
  latestVersion: string | null;
}

type Listener = (state: UpdateState) => void;

export class UpdateService {
  private state: UpdateState = {
    updateAvailable: false,
    requiredUpdate: false,
    currentVersion: APP_CONFIG.appVersion,
    latestVersion: APP_CONFIG.appVersion,
  };
  private listeners = new Set<Listener>();
  private applyUpdate: (() => Promise<void>) | null = null;

  /** アプリ起動時に1度呼ぶ。SW 登録と更新検知の土台を作る。 */
  init(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // vite-plugin-pwa の登録ヘルパ。
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => {
        // 新しい SW が waiting 状態。更新を提示する。
        this.patch({ updateAvailable: true });
      },
      onRegisteredSW: (_swUrl, registration) => {
        // 起動時 + 定期にサーバ上の SW 更新を確認。
        registration && this.scheduleSwUpdateCheck(registration);
      },
    });

    // updateSW(true) で skipWaiting → controllerchange → reload を実行。
    this.applyUpdate = async () => {
      await updateSW(true);
    };

    // controllerchange を検知して必要に応じてリロード（保険）。
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (this.state.requiredUpdate) window.location.reload();
    });

    // バージョン(app_versions)チェックも起動時/復帰時に実行。
    void this.checkVersion();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.checkVersion();
    });
  }

  private scheduleSwUpdateCheck(registration: ServiceWorkerRegistration): void {
    const check = () => registration.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    window.setInterval(check, 60 * 60 * 1000); // 1時間ごと
  }

  /** DB(app_versions) と現行バージョンを比較。MVP はモック。 */
  async checkVersion(): Promise<void> {
    const latest = await this.fetchLatestVersion();
    const requiredUpdate =
      latest != null && (latest.requiredUpdate || latest.version !== APP_CONFIG.appVersion);
    this.patch({ latestVersion: latest?.version ?? this.state.currentVersion, requiredUpdate });
    // 強制更新かつ SW 更新も可能なら自動適用。
    if (requiredUpdate && this.state.updateAvailable) {
      void this.applyNow();
    }
  }

  /** 本番では app_versions リポジトリ/Functions から取得。 */
  private async fetchLatestVersion(): Promise<AppVersion | null> {
    return {
      version: APP_CONFIG.appVersion,
      buildNumber: Number(APP_CONFIG.buildNumber) || 0,
      requiredUpdate: false,
      releaseNote: '',
      createdAt: new Date().toISOString(),
    };
  }

  /** ユーザーが「更新する」を押したとき、または強制更新時に実行。 */
  async applyNow(): Promise<void> {
    if (this.applyUpdate) {
      await this.applyUpdate();
    } else {
      window.location.reload();
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private patch(partial: Partial<UpdateState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l(this.state));
  }
}

export const updateService = new UpdateService();
