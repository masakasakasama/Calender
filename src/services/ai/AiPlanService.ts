// =====================================================================
// AIデートプラン提案のクライアント。
//  - Cloud Functions の suggestPlans を呼ぶ。
//  - Functions 未デプロイ / 失敗時は null を返し、UI 側で穏やかに案内する
//    （アプリ全体は壊さない）。
// =====================================================================
import { httpsCallable } from 'firebase/functions';
import { firebaseFunctions } from '@/services/firebase/firebaseApp';
import { isFirebaseConfigured } from '@/services/firebase/firebaseApp';

export interface AiPlanRequest {
  area?: string;
  date?: string; // YYYY-MM-DD
  mood?: string;
}

export interface AiPlan {
  tier: 'relax' | 'mild' | 'active';
  emoji: string;
  title: string;
  description: string;
  location: string;
  startHour: number;
  durationHours: number;
}

export interface AiPlanResult {
  ok: boolean;
  plans: AiPlan[];
  error?: string; // ユーザー向けメッセージ
}

export async function fetchAiPlans(req: AiPlanRequest): Promise<AiPlanResult> {
  if (!isFirebaseConfigured()) {
    return { ok: false, plans: [], error: 'AI機能は現在利用できません。' };
  }
  try {
    const callable = httpsCallable<AiPlanRequest, { plans: AiPlan[] }>(
      firebaseFunctions(),
      'suggestPlans',
    );
    const res = await callable(req);
    const plans = res.data?.plans ?? [];
    if (plans.length === 0) {
      return { ok: false, plans: [], error: 'プランが見つかりませんでした。もう一度お試しください。' };
    }
    return { ok: true, plans };
  } catch (e: unknown) {
    const msg =
      (e as { message?: string })?.message ??
      'AIの呼び出しに失敗しました。少し時間をおいて試してください。';
    return { ok: false, plans: [], error: msg };
  }
}
