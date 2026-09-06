import type { EventFormValue } from '@/components/calendar/EventModal';
import type { WeekendResearch, WeekendResearchItem } from '@/hooks/useWeekendResearch';

export interface WeekendEventPick {
  id: string;
  weekendKey: string;
  weekendLabel: string;
  tabLabel: string;
  title: string;
  emoji: string;
  categoryId: string;
  dateLabel: string;
  start: string;
  end: string;
  area: string;
  locationName: string;
  nearestStation: string;
  price: string;
  reservation: string;
  rainFriendly?: boolean;
  tags: string[];
  summary: string;
  coupleNote?: string;
  sourceName: string;
  url: string;
  imageUrl?: string;
  imageQuery: string;
}

export interface WeekendEventGroup {
  key: string;
  label: string;
  tabLabel: string;
  startsOn: string;
  endsOn: string;
  events: WeekendEventPick[];
}

type WeekendEventInput = Omit<WeekendEventPick, 'weekendKey' | 'weekendLabel' | 'tabLabel'>;

const makeEvent = (group: Omit<WeekendEventGroup, 'events'>, item: WeekendEventInput): WeekendEventPick => ({
  ...item,
  weekendKey: group.key,
  weekendLabel: group.label,
  tabLabel: group.tabLabel,
});

const weekendGroup = (meta: Omit<WeekendEventGroup, 'events'>, events: WeekendEventInput[]): WeekendEventGroup => ({
  ...meta,
  events: events.map((event) => makeEvent(meta, event)),
});

export const MONTHLY_WEEKEND_EVENTS: WeekendEventGroup[] = [
  weekendGroup(
    {
      key: '2026-09-12',
      label: '2026/09/12(土)-09/13(日)',
      tabLabel: '9/12-13',
      startsOn: '2026-09-12',
      endsOn: '2026-09-13',
    },
    [
      {
        id: '2026-09-12-tennoz-art-cruise',
        title: '天王洲周遊アートクルーズ',
        emoji: '🚤',
        categoryId: 'date',
        dateLabel: '9/12(土)-9/13(日)限定',
        start: '2026-09-12T12:00:00+09:00',
        end: '2026-09-12T12:40:00+09:00',
        area: '天王洲',
        locationName: 'T-LOTUS桟橋',
        nearestStation: '天王洲アイル駅',
        price: '大人1,500円',
        reservation: '予約推奨。当日空席があれば予約なしでも乗船可',
        rainFriendly: false,
        tags: ['週末限定', 'クルーズ', 'アート', '天王洲'],
        summary: 'TENNOZ ART WEEK 2026に合わせた9月12日・13日限定クルーズ。運河から大型壁画や天王洲の街並みを見る、今週末限定性の高い候補です。',
        coupleNote: 'クルーズ後に天王洲のアート展示やカフェへつなげやすいです。',
        sourceName: 'しながわ観光協会 / GO TOKYO',
        url: 'https://shinagawa-kanko.or.jp/event/shinagawacruise202609tennoz/',
        imageUrl: 'https://www.gotokyo.org/jp/event/tokyotouristinfo/images/shinagawacruise_pastview.jpg',
        imageQuery: '天王洲周遊アートクルーズ 公式',
      },
      {
        id: '2026-09-13-september-sumo',
        title: '大相撲九月場所',
        emoji: '🏟️',
        categoryId: 'date',
        dateLabel: '9/13(日) 初日',
        start: '2026-09-13T14:00:00+09:00',
        end: '2026-09-13T18:00:00+09:00',
        area: '両国',
        locationName: '両国国技館',
        nearestStation: '両国駅',
        price: '席種別。公式で確認',
        reservation: 'チケット確認必須',
        rainFriendly: true,
        tags: ['初日', '屋内', '相撲', '両国'],
        summary: '9月13日開幕の本場所。初日はこの日だけなので、長期開催イベントより優先度を上げています。',
        coupleNote: 'チケットが取れれば強い屋内候補。両国でちゃんこや和食と組み合わせやすいです。',
        sourceName: '日本相撲協会公式',
        url: 'https://sumo.or.jp/Watching/isolate/637/',
        imageUrl: 'https://sumo.or.jp/img/watching/tokyo.gif',
        imageQuery: '大相撲九月場所 両国国技館 公式',
      },
      {
        id: '2026-09-12-togoshi-hachiman-festival',
        title: '戸越八幡神社 例大祭2026',
        emoji: '🏮',
        categoryId: 'date',
        dateLabel: '9/12(土)-9/13(日)限定',
        start: '2026-09-12T12:00:00+09:00',
        end: '2026-09-12T18:00:00+09:00',
        area: '戸越',
        locationName: '戸越八幡神社',
        nearestStation: '戸越駅 / 戸越公園駅 / 戸越銀座駅',
        price: '無料',
        reservation: '不要。天候による変更・中止は公式確認',
        rainFriendly: false,
        tags: ['週末限定', '祭り', '神社', '戸越'],
        summary: '9月12日・13日の2日間限定。大祭式や奉納演芸が予定される秋祭りで、戸越銀座散策と合わせやすいです。',
        coupleNote: '食べ歩きも入れたいなら戸越銀座までセットにすると半日プランになります。',
        sourceName: 'しながわ観光協会',
        url: 'https://shinagawa-kanko.or.jp/event/togoshireitaisai2026/',
        imageUrl: 'https://shinagawa-kanko.or.jp/wp-content/uploads/2026/08/scan-001-1.jpg',
        imageQuery: '戸越八幡神社 例大祭 2026 公式',
      },
    ],
  ),
  weekendGroup(
    {
      key: '2026-09-19',
      label: '2026/09/19(土)-09/21(月祝)',
      tabLabel: '9/19-21',
      startsOn: '2026-09-19',
      endsOn: '2026-09-21',
    },
    [
      {
        id: '2026-09-19-tokyo-game-show',
        title: '東京ゲームショウ2026 一般公開日',
        emoji: '🎮',
        categoryId: 'date',
        dateLabel: '9/19(土)-9/21(月祝)',
        start: '2026-09-19T09:30:00+09:00',
        end: '2026-09-19T17:00:00+09:00',
        area: '幕張',
        locationName: '幕張メッセ',
        nearestStation: '海浜幕張駅',
        price: 'チケット制。公式で確認',
        reservation: 'チケット確認必須',
        rainFriendly: true,
        tags: ['三連休限定', '屋内', 'ゲーム', '大型イベント'],
        summary: '30周年のTGS 2026。一般公開は9月19日から21日の3日間だけで、今週末の最優先級候補です。',
        coupleNote: 'ゲーム好きなら最優先。混雑と待機時間を長めに見ます。',
        sourceName: '東京ゲームショウ公式',
        url: 'https://tgs.cesa.or.jp/2026/',
        imageUrl: 'https://tgs.cesa.or.jp/2026/images/home/overview_theme.png',
        imageQuery: '東京ゲームショウ2026 公式',
      },
      {
        id: '2026-09-20-yokohama-night-flowers',
        title: '横浜ナイトフラワーズ2026',
        emoji: '🎆',
        categoryId: 'date',
        dateLabel: '9/20(日) 19:00限定',
        start: '2026-09-20T19:00:00+09:00',
        end: '2026-09-20T19:05:00+09:00',
        area: 'みなとみらい',
        locationName: '横浜港 大さん橋周辺',
        nearestStation: '日本大通り駅 / 馬車道駅',
        price: '無料',
        reservation: '不要。天候や当日案内を確認',
        rainFriendly: false,
        tags: ['日曜限定', '無料', '花火', '横浜'],
        summary: '9月20日19時から大さん橋で約5分の短時間花火。横浜デートの締めに差し込みやすいです。',
        coupleNote: '赤レンガ、中華街、みなとみらいのいずれとも組み合わせやすいです。',
        sourceName: '横浜市観光公式サイト',
        url: 'https://www.welcome.city.yokohama.jp/eventinfo/ev_detail.php?bid=yw11005',
        imageUrl: 'https://ycvb.yokohama/img_data/yw10951_1.jpg',
        imageQuery: '横浜ナイトフラワーズ2026 公式',
      },
      {
        id: '2026-09-19-moon-art-night',
        title: 'ムーンアートナイト下北沢2026',
        emoji: '🌕',
        categoryId: 'date',
        dateLabel: '9/18(金)-10/4(日)',
        start: '2026-09-19T18:00:00+09:00',
        end: '2026-09-19T21:00:00+09:00',
        area: '下北沢',
        locationName: '下北沢エリア全域・下北線路街',
        nearestStation: '下北沢駅 / 東北沢駅',
        price: '一部チケット制。無料鑑賞エリアあり',
        reservation: '有料作品はチケット確認',
        rainFriendly: false,
        tags: ['アート', '夜散歩', '下北沢', '長期開催'],
        summary: '下北沢の街全体を使うアートフェス。この週末はライブやシルクスクリーン屋台など週末企画もありますが、会期は10月4日までなので限定イベントより下位です。',
        coupleNote: '夜散歩と食事の相性がよく、下北沢で完結できます。',
        sourceName: 'ムーンアートナイト下北沢公式',
        url: 'https://moonartnightfes.com/',
        imageUrl: 'https://moonartnightfes.com/img/hero.png',
        imageQuery: 'ムーンアートナイト下北沢2026 公式',
      },
    ],
  ),
  weekendGroup(
    {
      key: '2026-09-26',
      label: '2026/09/26(土)-09/27(日)',
      tabLabel: '9/26-27',
      startsOn: '2026-09-26',
      endsOn: '2026-09-27',
    },
    [
      {
        id: '2026-09-26-shinagawa-shukuba-matsuri',
        title: '第33回 しながわ宿場まつり',
        emoji: '🏮',
        categoryId: 'date',
        dateLabel: '9/26(土)-9/27(日)限定',
        start: '2026-09-26T16:00:00+09:00',
        end: '2026-09-26T20:30:00+09:00',
        area: '北品川・新馬場',
        locationName: '旧東海道 品川宿エリア',
        nearestStation: '北品川駅 / 新馬場駅 / 青物横丁駅',
        price: '観覧無料',
        reservation: '不要。催しの変更・中止は公式確認',
        rainFriendly: false,
        tags: ['週末限定', '祭り', 'おいらん道中', '品川'],
        summary: '9月26日・27日の2日間限定。おいらん道中、宿場ナイト、江戸扮装のまつり行列などがまとまる大型地域祭りです。',
        coupleNote: '夕方からおいらん道中と宿場ナイトを狙うとデート向きです。',
        sourceName: 'しながわ観光協会',
        url: 'https://shinagawa-kanko.or.jp/event/shukubamatsuri2026/',
        imageUrl: 'https://shinagawa-kanko.or.jp/wp-content/uploads/2026/08/1787726672105-scaled-e1787727314674.jpg',
        imageQuery: 'しながわ宿場まつり 2026 公式',
      },
      {
        id: '2026-09-26-september-sumo-final-weekend',
        title: '大相撲九月場所 千秋楽週末',
        emoji: '🏟️',
        categoryId: 'date',
        dateLabel: '9/26(土)-9/27(日) 千秋楽週末',
        start: '2026-09-26T14:00:00+09:00',
        end: '2026-09-26T18:00:00+09:00',
        area: '両国',
        locationName: '両国国技館',
        nearestStation: '両国駅',
        price: '席種別。公式で確認',
        reservation: 'チケット確認必須',
        rainFriendly: true,
        tags: ['千秋楽週末', '屋内', '相撲', '両国'],
        summary: '9月27日が千秋楽。通常の会期中より価値が高い終盤週末なので上位候補です。',
        coupleNote: 'チケットが取れれば強い屋内候補です。',
        sourceName: '日本相撲協会公式',
        url: 'https://sumo.or.jp/Watching/isolate/637/',
        imageUrl: 'https://sumo.or.jp/img/watching/tokyo.gif',
        imageQuery: '大相撲九月場所 両国国技館 公式',
      },
      {
        id: '2026-09-26-moon-art-night',
        title: 'ムーンアートナイト下北沢2026',
        emoji: '🌕',
        categoryId: 'date',
        dateLabel: '9/26(土)-9/27(日) 週末企画あり',
        start: '2026-09-26T18:00:00+09:00',
        end: '2026-09-26T21:00:00+09:00',
        area: '下北沢',
        locationName: '下北沢エリア全域・下北線路街',
        nearestStation: '下北沢駅 / 東北沢駅',
        price: '一部チケット制。無料鑑賞エリアあり',
        reservation: '有料作品はチケット確認',
        rainFriendly: false,
        tags: ['アート', '週末企画', '下北沢', '長期開催'],
        summary: '会期中盤ですが、9月26日・27日は週末限定の即興企画などが設定されています。宿場まつりや千秋楽週末よりは下位です。',
        coupleNote: '夜だけ軽く動くなら使いやすいです。',
        sourceName: 'ムーンアートナイト下北沢公式',
        url: 'https://moonartnightfes.com/',
        imageUrl: 'https://moonartnightfes.com/img/hero.png',
        imageQuery: 'ムーンアートナイト下北沢2026 公式',
      },
    ],
  ),
  weekendGroup(
    {
      key: '2026-10-03',
      label: '2026/10/03(土)-10/04(日)',
      tabLabel: '10/3-4',
      startsOn: '2026-10-03',
      endsOn: '2026-10-04',
    },
    [
      {
        id: '2026-10-03-moon-art-night-final-weekend',
        title: 'ムーンアートナイト下北沢2026 最終週末',
        emoji: '🌕',
        categoryId: 'date',
        dateLabel: '10/3(土)-10/4(日) 最終週末',
        start: '2026-10-03T18:00:00+09:00',
        end: '2026-10-03T21:00:00+09:00',
        area: '下北沢',
        locationName: '下北沢エリア全域・下北線路街',
        nearestStation: '下北沢駅 / 東北沢駅',
        price: '一部チケット制。無料鑑賞エリアあり',
        reservation: '有料作品はチケット確認',
        rainFriendly: false,
        tags: ['最終週末', 'アート', '夜散歩', '下北沢'],
        summary: '10月4日で終了。この週末を逃すと行けないため、長期開催中盤ではなく最終週末として上位に戻しています。',
        coupleNote: '10月3日は週末企画もあり、夜デートに使いやすいです。',
        sourceName: 'ムーンアートナイト下北沢公式',
        url: 'https://moonartnightfes.com/',
        imageUrl: 'https://moonartnightfes.com/img/hero.png',
        imageQuery: 'ムーンアートナイト下北沢2026 公式',
      },
      {
        id: '2026-10-03-gotoh-national-treasure',
        title: '五島美術館 国宝「紫式部日記絵巻」特別展示',
        emoji: '🏺',
        categoryId: 'date',
        dateLabel: '10/3(土)-10/12(月祝) 特別展示',
        start: '2026-10-04T11:00:00+09:00',
        end: '2026-10-04T13:00:00+09:00',
        area: '上野毛',
        locationName: '五島美術館',
        nearestStation: '上野毛駅',
        price: '一般1,100円',
        reservation: '不要。開館日を確認',
        rainFriendly: true,
        tags: ['期間限定', '屋内', '美術館', '国宝'],
        summary: '通常展の中でも10月3日から12日だけ国宝「紫式部日記絵巻」五島本を特別展示する期間です。',
        coupleNote: '静かな屋内候補。二子玉川方面の食事と組み合わせやすいです。',
        sourceName: '五島美術館公式',
        url: 'https://www.gotoh-museum.or.jp/event/next/',
        imageUrl: 'https://www.gotoh-museum.or.jp/wp-content/uploads/2026/05/2026_0905-img01.png',
        imageQuery: '五島美術館 紫式部日記絵巻 2026 公式',
      },
    ],
  ),
  weekendGroup(
    {
      key: '2026-10-10',
      label: '2026/10/10(土)-10/12(月祝)',
      tabLabel: '10/10-12',
      startsOn: '2026-10-10',
      endsOn: '2026-10-12',
    },
    [
      {
        id: '2026-10-10-tokyo-yosakoi',
        title: '第27回 東京よさこい',
        emoji: '💃',
        categoryId: 'date',
        dateLabel: '10/10(土)-10/11(日)限定',
        start: '2026-10-10T12:00:00+09:00',
        end: '2026-10-10T18:00:00+09:00',
        area: '池袋',
        locationName: '池袋駅周辺5会場',
        nearestStation: '池袋駅',
        price: '観覧無料',
        reservation: '不要。演舞スケジュール確認',
        rainFriendly: false,
        tags: ['週末限定', '大型祭り', '踊り', '池袋'],
        summary: '10月10日・11日の2日間限定。池袋の複数会場で演舞する都内最大級のよさこい祭りです。',
        coupleNote: '池袋で食事やカフェに逃げやすく、混雑時も予定を崩しにくいです。',
        sourceName: '東京よさこい公式',
        url: 'https://tokyo-yosakoi.jp/',
        imageUrl: 'https://tokyo-yosakoi.jp/wp-content/themes/yosakoitokyo/assets/img/fv_pc.png',
        imageQuery: '東京よさこい2026 公式',
      },
      {
        id: '2026-10-11-ikegami-oeshiki',
        title: '池上本門寺 お会式',
        emoji: '🏮',
        categoryId: 'date',
        dateLabel: '10/11(日)-10/13(火)',
        start: '2026-10-11T18:00:00+09:00',
        end: '2026-10-11T21:00:00+09:00',
        area: '池上',
        locationName: '池上本門寺',
        nearestStation: '池上駅',
        price: '観覧無料',
        reservation: '不要。主要行事の時刻は公式確認',
        rainFriendly: false,
        tags: ['三連休', '大型祭り', '万灯', '池上'],
        summary: '10月11日から13日。約3,000人の万灯練供養などで知られ、例年約30万人が参加する大規模行事です。三連休候補として優先度高めです。',
        coupleNote: '夜の万灯が見どころ。混雑前提で駅からの動線を先に決めるのが無難です。',
        sourceName: 'GO TOKYO / 池上本門寺公式',
        url: 'https://www.gotokyo.org/jp/spot/ev141/index.html',
        imageUrl: 'https://www.gotokyo.org/en/spot/ev141/images/ev141_sub_001a_gd10024.webp',
        imageQuery: '池上本門寺 お会式 2026 公式',
      },
      {
        id: '2026-10-11-yokohama-night-flowers',
        title: '横浜ナイトフラワーズ2026',
        emoji: '🎆',
        categoryId: 'date',
        dateLabel: '10/11(日) 19:00限定',
        start: '2026-10-11T19:00:00+09:00',
        end: '2026-10-11T19:05:00+09:00',
        area: 'みなとみらい',
        locationName: '横浜港 大さん橋周辺',
        nearestStation: '日本大通り駅 / 馬車道駅',
        price: '無料',
        reservation: '不要。天候や当日案内を確認',
        rainFriendly: false,
        tags: ['日曜限定', '無料', '花火', '横浜'],
        summary: '10月11日19時から大さん橋で約5分。横浜に寄せる場合の夜候補です。',
        coupleNote: '中華街や赤レンガとセットにする前提です。',
        sourceName: '横浜市観光公式サイト',
        url: 'https://www.welcome.city.yokohama.jp/eventinfo/ev_detail.php?bid=yw11005',
        imageUrl: 'https://ycvb.yokohama/img_data/yw10951_1.jpg',
        imageQuery: '横浜ナイトフラワーズ2026 公式',
      },
    ],
  ),
  weekendGroup(
    {
      key: '2026-10-17',
      label: '2026/10/17(土)-10/18(日)',
      tabLabel: '10/17-18',
      startsOn: '2026-10-17',
      endsOn: '2026-10-18',
    },
    [
      {
        id: '2026-10-17-global-festa-japan',
        title: 'グローバルフェスタJAPAN2026',
        emoji: '🌍',
        categoryId: 'meal',
        dateLabel: '10/17(土)-10/18(日)限定',
        start: '2026-10-17T10:00:00+09:00',
        end: '2026-10-17T17:00:00+09:00',
        area: '西新宿',
        locationName: '新宿住友ビル三角広場・新宿中央公園',
        nearestStation: '都庁前駅 / 新宿駅',
        price: '入場無料',
        reservation: '不要想定。公式案内確認',
        rainFriendly: true,
        tags: ['週末限定', '無料', '世界のフード', '屋内あり'],
        summary: '10月17日・18日の2日間限定。世界のフード、ステージ、国際協力団体のブースが集まり、屋内会場もあるため天候にも比較的強いです。',
        coupleNote: '新宿完結で、短時間でも半日でも調整しやすいです。',
        sourceName: 'グローバルフェスタJAPAN2026公式',
        url: 'https://gfjapan2026.jp/',
        imageUrl: 'https://gfjapan2026.jp/assets/img/img_kv.jpg',
        imageQuery: 'グローバルフェスタJAPAN2026 公式',
      },
    ],
  ),
  weekendGroup(
    {
      key: '2026-10-24',
      label: '2026/10/24(土)-10/25(日)',
      tabLabel: '10/24-25',
      startsOn: '2026-10-24',
      endsOn: '2026-10-25',
    },
    [
      {
        id: '2026-10-24-tokyo-night-market',
        title: '東京ナイトマーケット',
        emoji: '🌃',
        categoryId: 'meal',
        dateLabel: '10/24(土)-10/25(日) 週末',
        start: '2026-10-24T14:00:00+09:00',
        end: '2026-10-24T22:00:00+09:00',
        area: '代々木公園',
        locationName: '代々木公園 ケヤキ並木',
        nearestStation: '原宿駅 / 明治神宮前駅 / 代々木公園駅',
        price: '入場無料。飲食は有料',
        reservation: '不要',
        rainFriendly: false,
        tags: ['最終週末', '無料', 'ナイトマーケット', '代々木'],
        summary: '10月21日から25日まで開催。土日は14時から22時で、10月25日が最終日なのでこの週末の優先度は高めです。',
        coupleNote: '夕方から食べ歩きと音楽を合わせやすいです。',
        sourceName: '東京ナイトマーケット公式',
        url: 'https://tokyo-night-market.com/',
        imageUrl: 'https://tokyo-night-market.com/wp-content/uploads/2026/07/2026l.png',
        imageQuery: '東京ナイトマーケット 2026 公式',
      },
      {
        id: '2026-10-24-tokyo-grand-tea-ceremony',
        title: '東京大茶会2026 江戸東京たてもの園',
        emoji: '🍵',
        categoryId: 'date',
        dateLabel: '10/24(土)-10/25(日)限定',
        start: '2026-10-25T10:30:00+09:00',
        end: '2026-10-25T16:00:00+09:00',
        area: '小金井',
        locationName: '江戸東京たてもの園',
        nearestStation: '武蔵小金井駅 / 花小金井駅',
        price: '入園無料。茶席は有料プログラムあり',
        reservation: '茶席は公式案内確認',
        rainFriendly: false,
        tags: ['週末限定', '茶会', '江戸文化', '小金井'],
        summary: '江戸東京たてもの園会場は10月24日・25日の2日間限定。茶道初心者でも参加しやすい秋の伝統文化イベントです。',
        coupleNote: '小金井公園散歩までつなげると半日プランになります。',
        sourceName: 'アーツカウンシル東京 伝統文化事業公式',
        url: 'https://www.tokyo-tradition.jp/2026/',
        imageUrl: 'https://www.tokyo-tradition.jp/2026/images/photo-ocha.webp',
        imageQuery: '東京大茶会2026 公式',
      },
      {
        id: '2026-10-24-yokohama-night-flowers',
        title: '横浜ナイトフラワーズ2026',
        emoji: '🎆',
        categoryId: 'date',
        dateLabel: '10/24(土) 19:00限定',
        start: '2026-10-24T19:00:00+09:00',
        end: '2026-10-24T19:05:00+09:00',
        area: 'みなとみらい',
        locationName: '横浜港 新港ふ頭周辺',
        nearestStation: 'みなとみらい駅 / 馬車道駅 / 桜木町駅',
        price: '無料',
        reservation: '不要。天候や当日案内を確認',
        rainFriendly: false,
        tags: ['土曜限定', '無料', '花火', '横浜'],
        summary: '10月24日19時から新港ふ頭で約5分。横浜方面の夜デートに合わせる候補です。',
        coupleNote: '赤レンガやみなとみらい散歩とセットにします。',
        sourceName: '横浜市観光公式サイト',
        url: 'https://www.welcome.city.yokohama.jp/eventinfo/ev_detail.php?bid=yw11005',
        imageUrl: 'https://ycvb.yokohama/img_data/yw10951_1.jpg',
        imageQuery: '横浜ナイトフラワーズ2026 公式',
      },
    ],
  ),
];

function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function upcomingWeekendEventGroups(now = new Date()): WeekendEventGroup[] {
  const today = toDateOnly(now);
  return MONTHLY_WEEKEND_EVENTS.filter((group) => group.endsOn >= today);
}

function toTabLabel(value: string): string {
  const [, month, day] = value.split('-');
  return `${Number(month)}/${Number(day)}`;
}

export function weekendResearchToGroups(research: WeekendResearch | null): WeekendEventGroup[] {
  if (!research) return [];

  const key = research.targetWeekend.start;
  const tabLabel = `${toTabLabel(research.targetWeekend.start)}-${toTabLabel(research.targetWeekend.end)}`;

  return [
    {
      key,
      label: research.targetWeekend.label,
      tabLabel,
      startsOn: research.targetWeekend.start,
      endsOn: research.targetWeekend.end,
      events: research.items
        .filter((item) => Boolean(item.imageUrl?.trim()))
        .map((item) => ({
          id: item.id,
          weekendKey: key,
          weekendLabel: research.targetWeekend.label,
          tabLabel,
          title: item.title,
          emoji: item.emoji,
          categoryId: item.categoryId,
          dateLabel: item.dateLabel,
          start: item.start,
          end: item.end,
          area: item.area,
          locationName: item.locationName,
          nearestStation: item.nearestStation,
          price: item.price,
          reservation: item.reservation,
          rainFriendly: item.rainFriendly,
          tags: item.tags,
          summary: item.summary,
          coupleNote: item.coupleNote,
          sourceName: item.sourceName,
          url: item.url,
          imageUrl: item.imageUrl ?? undefined,
          imageQuery: `${item.title} ${item.locationName}`.trim(),
        })),
    },
  ].filter((group) => group.events.length > 0);
}

export function weekendEventToInitial(item: WeekendEventPick): Partial<EventFormValue> {
  return {
    title: `${item.emoji} ${item.title}`,
    description: [
      item.summary,
      '',
      `日程: ${item.dateLabel}`,
      `エリア: ${item.area}`,
      `最寄り: ${item.nearestStation}`,
      `料金: ${item.price}`,
      `予約: ${item.reservation}`,
      `出典: ${item.sourceName}`,
      item.url,
    ].join('\n'),
    location: item.locationName,
    start: new Date(item.start).toISOString(),
    end: new Date(item.end).toISOString(),
    reminderMinutes: 60,
    color: null,
    emoji: item.emoji,
    categoryId: item.categoryId,
    mapsPlaceId: null,
    recurrence: { frequency: 'none', count: 1 },
    visibility: 'shared',
  };
}

export function weekendEventToFeedbackItem(item: WeekendEventPick): WeekendResearchItem {
  return {
    id: item.id,
    title: item.title,
    emoji: item.emoji,
    categoryId: item.categoryId,
    dateLabel: item.dateLabel,
    start: item.start,
    end: item.end,
    area: item.area,
    locationName: item.locationName,
    nearestStation: item.nearestStation,
    price: item.price,
    reservation: item.reservation,
    rainFriendly: item.rainFriendly ?? item.tags.includes('屋内'),
    tags: item.tags,
    summary: item.summary,
    coupleNote: item.coupleNote ?? item.summary,
    sourceName: item.sourceName,
    url: item.url,
    imageUrl: item.imageUrl ?? null,
  };
}

export function weekendEventToInitialWithResearch(item: WeekendEventPick): Partial<EventFormValue> {
  return weekendEventToInitial(item);
}

export function weekendEventToFeedbackItemWithResearch(item: WeekendEventPick): WeekendResearchItem {
  return weekendEventToFeedbackItem(item);
}
