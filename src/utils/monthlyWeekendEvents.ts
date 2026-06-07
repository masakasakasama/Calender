import type { EventFormValue } from '@/components/calendar/EventModal';
import type { WeekendResearchItem } from '@/hooks/useWeekendResearch';

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
  tags: string[];
  summary: string;
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

export const MONTHLY_WEEKEND_EVENTS: WeekendEventGroup[] = [
  {
    key: '2026-06-13',
    label: '2026/06/13(土)-06/14(日)',
    tabLabel: '6/13-14',
    startsOn: '2026-06-13',
    endsOn: '2026-06-14',
    events: [
      {
        id: '2026-06-13-tokyo-tower-amanogawa',
        weekendKey: '2026-06-13',
        weekendLabel: '2026/06/13(土)-06/14(日)',
        tabLabel: '6/13-14',
        title: '東京タワー 天の川イルミネーション2026',
        emoji: '🌌',
        categoryId: 'date',
        dateLabel: '6/13(土) 夜',
        start: '2026-06-13T19:00:00+09:00',
        end: '2026-06-13T21:30:00+09:00',
        area: '芝公園',
        locationName: '東京タワー メインデッキ',
        nearestStation: '赤羽橋駅 / 神谷町駅 / 御成門駅',
        price: 'メインデッキ入場料',
        reservation: '混雑時は前売り確認',
        tags: ['夜景', 'イルミネーション', '七夕', '屋内'],
        summary:
          'メインデッキに約3万球の光で天の川をつくる夏のイルミネーション。窓に映る光と東京の夜景が重なって、七夕前の夜にちょうどいい雰囲気になる。',
        sourceName: '東京タワー公式',
        url: 'https://www.tokyotower.co.jp/event/amanogawa2026/',
        imageUrl: 'https://www.tokyotower.co.jp/event/amanogawa2026/3573/8427/amanogawa2.jpg',
        imageQuery: '東京タワー 天の川イルミネーション',
      },
      {
        id: '2026-06-13-hana-biyori-firefly',
        weekendKey: '2026-06-13',
        weekendLabel: '2026/06/13(土)-06/14(日)',
        tabLabel: '6/13-14',
        title: 'HANA・BIYORI ほたるびより',
        emoji: '✨',
        categoryId: 'date',
        dateLabel: '6/13(土) 夜',
        start: '2026-06-13T18:45:00+09:00',
        end: '2026-06-13T21:00:00+09:00',
        area: '稲城',
        locationName: 'HANA・BIYORI',
        nearestStation: '京王よみうりランド駅',
        price: '入園料・時間指定チケット確認',
        reservation: '時間指定チケット確認',
        tags: ['蛍', '花', '夜', '庭園'],
        summary:
          '花の温室と庭園を抜けた先で、夜だけの蛍観賞を楽しめる季節イベント。暗くなってからの光の動きが主役なので、昼の展示と夜の散歩をつなげやすい。',
        sourceName: 'よみうりランド公式ニュース',
        url: 'https://yomiuriland.co.jp/news/wp-content/uploads/2025/04/release_250424.pdf',
        imageUrl:
          'https://www.yomiuriland.com/hanabiyori/contents/wp-content/uploads/2026/04/%E3%81%BB%E3%81%9F%E3%82%8B0419.jpg',
        imageQuery: 'HANA BIYORI ほたるびより',
      },
      {
        id: '2026-06-13-bunkyo-ajisai',
        weekendKey: '2026-06-13',
        weekendLabel: '2026/06/13(土)-06/14(日)',
        tabLabel: '6/13-14',
        title: '文京あじさいまつり',
        emoji: '💠',
        categoryId: 'date',
        dateLabel: '6/13(土)-6/14(日)',
        start: '2026-06-14T11:00:00+09:00',
        end: '2026-06-14T14:00:00+09:00',
        area: '白山',
        locationName: '白山神社・白山公園',
        nearestStation: '白山駅 / 本駒込駅',
        price: '無料',
        reservation: '予約不要',
        tags: ['あじさい', '花', '神社', '散歩'],
        summary:
          '白山神社から白山公園まで、約3000株の紫陽花が梅雨の参道を彩る。週末は屋台や催しも出るので、花を見てから本郷・神保町方面へ流しやすい。',
        sourceName: '文京区観光協会',
        url: 'https://b-kanko.jp/event/419',
        imageQuery: '文京あじさいまつり 白山神社',
      },
    ],
  },
  {
    key: '2026-06-20',
    label: '2026/06/20(土)-06/21(日)',
    tabLabel: '6/20-21',
    startsOn: '2026-06-20',
    endsOn: '2026-06-21',
    events: [
      {
        id: '2026-06-20-hosoda-genten',
        weekendKey: '2026-06-20',
        weekendLabel: '2026/06/20(土)-06/21(日)',
        tabLabel: '6/20-21',
        title: '細田守の原点/展',
        emoji: '🎬',
        categoryId: 'date',
        dateLabel: '6/20(土) 開幕',
        start: '2026-06-20T13:00:00+09:00',
        end: '2026-06-20T15:30:00+09:00',
        area: '京橋',
        locationName: 'CREATIVE MUSEUM TOKYO',
        nearestStation: '京橋駅 / 東京駅',
        price: 'チケット制',
        reservation: '日時・券種確認',
        tags: ['展示', '映画', 'アニメーション', '屋内'],
        summary:
          '「時をかける少女」20周年を軸に、細田守作品の絵コンテ、制作資料、代表作の世界観をたどる展覧会。東京駅から近く、雨の日でも昼から夜まで組みやすい。',
        sourceName: 'CREATIVE MUSEUM TOKYO / 公式発表',
        url: 'https://prtimes.jp/a/?c=179608&f=d179608-3-d0980e0d441b135e2a46dba9cf884bc9.pdf&r=3',
        imageQuery: '細田守の原点展 CREATIVE MUSEUM TOKYO',
      },
      {
        id: '2026-06-20-hiroko-koshino',
        weekendKey: '2026-06-20',
        weekendLabel: '2026/06/20(土)-06/21(日)',
        tabLabel: '6/20-21',
        title: '(UN)KNOWN HIROKO KOSHINO',
        emoji: '🖤',
        categoryId: 'date',
        dateLabel: '開催中',
        start: '2026-06-21T12:30:00+09:00',
        end: '2026-06-21T15:00:00+09:00',
        area: '清澄白河',
        locationName: '東京都現代美術館',
        nearestStation: '清澄白河駅 / 木場駅',
        price: 'チケット制',
        reservation: 'チケット確認',
        tags: ['ファッション', '現代美術', '屋内', '清澄白河'],
        summary:
          'コシノヒロコの服、絵画、インスタレーションを横断して見せる企画展。美術館の広さと清澄白河のカフェ街が合うので、展示後にそのまま話を続けやすい。',
        sourceName: 'PR TIMES / 展覧会公式発表',
        url: 'https://prtimes.jp/main/html/rd/p/000000010.000178258.html',
        imageUrl:
          'https://prcdn.freetls.fastly.net/release_image/178258/10/178258-10-85f403035980614ea644e022de317deb-3000x2250.jpg?format=jpeg&auto=webp&fit=bounds&width=1200&height=630',
        imageQuery: 'UNKNOWN HIROKO KOSHINO 東京都現代美術館',
      },
      {
        id: '2026-06-20-otorisama-ajisai',
        weekendKey: '2026-06-20',
        weekendLabel: '2026/06/20(土)-06/21(日)',
        tabLabel: '6/20-21',
        title: '夏のお酉さま あじさい祭',
        emoji: '🏮',
        categoryId: 'date',
        dateLabel: '6/20(土)-6/21(日)',
        start: '2026-06-20T13:00:00+09:00',
        end: '2026-06-20T16:30:00+09:00',
        area: '浅草・千束',
        locationName: '長國寺',
        nearestStation: '入谷駅 / 三ノ輪駅 / 浅草駅',
        price: '無料中心',
        reservation: '予約不要',
        tags: ['あじさい', '縁日', '浅草', '祭り'],
        summary:
          '長國寺境内に紫陽花の装飾、屋台縁日、ステージ演目が並ぶ初夏の下町イベント。浅草寄りで食事の選択肢が多く、夕方まで軽く歩ける。',
        sourceName: '号外NET 台東区',
        url: 'https://taito.goguynet.jp/2026/06/04/hydrangea/',
        imageUrl: 'https://taito.goguynet.jp/wp-content/uploads/sites/235/2026/06/IMG_4841.jpg',
        imageQuery: '夏のお酉さま あじさい祭 長國寺',
      },
    ],
  },
  {
    key: '2026-06-27',
    label: '2026/06/27(土)-06/28(日)',
    tabLabel: '6/27-28',
    startsOn: '2026-06-27',
    endsOn: '2026-06-28',
    events: [
      {
        id: '2026-06-27-graphic-trials',
        weekendKey: '2026-06-27',
        weekendLabel: '2026/06/27(土)-06/28(日)',
        tabLabel: '6/27-28',
        title: '80 GRAPHIC TRIALS',
        emoji: '🖨️',
        categoryId: 'date',
        dateLabel: '6/27(土) 開幕',
        start: '2026-06-27T12:00:00+09:00',
        end: '2026-06-27T14:30:00+09:00',
        area: '飯田橋',
        locationName: '印刷博物館 P&Pギャラリー',
        nearestStation: '飯田橋駅 / 江戸川橋駅',
        price: 'P&Pギャラリー無料',
        reservation: '予約不要中心',
        tags: ['デザイン', 'ポスター', '屋内', '展示'],
        summary:
          'GRAPHIC TRIAL 20年分、80組のクリエイターによるポスター作品を400点規模で紹介する展示。色、紙、印刷の見方で会話が作れるタイプの展示。',
        sourceName: '印刷博物館公式',
        url: 'https://www.printing-museum.org/collection/exhibition/g20260627.php',
        imageUrl: 'https://www.printing-museum.org/assets/img/common/ogp.jpg',
        imageQuery: '80 GRAPHIC TRIALS 印刷博物館',
      },
      {
        id: '2026-06-27-ghibli-rittai',
        weekendKey: '2026-06-27',
        weekendLabel: '2026/06/27(土)-06/28(日)',
        tabLabel: '6/27-28',
        title: 'ジブリの立体造型物展',
        emoji: '🌿',
        categoryId: 'date',
        dateLabel: '開催中',
        start: '2026-06-28T13:00:00+09:00',
        end: '2026-06-28T15:30:00+09:00',
        area: '天王洲',
        locationName: '寺田倉庫 B&C HALL / E HALL',
        nearestStation: '天王洲アイル駅',
        price: 'チケット制',
        reservation: '日時指定確認',
        tags: ['ジブリ', '立体造型', '展示', '屋内'],
        summary:
          'ジブリ作品の名場面を立体造型で紹介する展覧会。倉庫街の展示空間と運河沿いの雰囲気が合い、天王洲でごはんまでまとめやすい。',
        sourceName: 'スタジオジブリ公式',
        url: 'https://www.ghibli.jp/event/rittai/',
        imageUrl: 'https://www.ghibli.jp/images/rittai01.jpg',
        imageQuery: 'ジブリの立体造型物展 寺田倉庫',
      },
      {
        id: '2026-06-27-lag-bruno-taut',
        weekendKey: '2026-06-27',
        weekendLabel: '2026/06/27(土)-06/28(日)',
        tabLabel: '6/27-28',
        title: '飯沼珠実「Salut, Mr Bruno Taut」',
        emoji: '📷',
        categoryId: 'date',
        dateLabel: '6/27(土) 最終日',
        start: '2026-06-27T15:30:00+09:00',
        end: '2026-06-27T17:00:00+09:00',
        area: '外苑前',
        locationName: 'LAG',
        nearestStation: '外苑前駅',
        price: '無料確認',
        reservation: 'ギャラリー情報確認',
        tags: ['写真', '建築', 'ギャラリー', '表参道'],
        summary:
          'ブルーノ・タウトをめぐる写真展示。小さめのギャラリーで見たあと、外苑前から表参道方面へ歩けるので、静かな午後の寄り道にしやすい。',
        sourceName: 'Tokyo Art Beat',
        url: 'https://www.tokyoartbeat.com/events/-/Tamami-Iinuma-Salut-Mr-Bruno-Taut/lag-live-art-gallery/2026-06-05',
        imageUrl:
          'https://images.ctfassets.net/j05yk38inose/siS8cI27uExM1Lw1RIhVs/6f0f68b9cbf979670d87a2c4cebd4f2f/MV_iinuma.jpeg?w=1200',
        imageQuery: '飯沼珠実 Salut Mr Bruno Taut LAG',
      },
    ],
  },
  {
    key: '2026-07-04',
    label: '2026/07/04(土)-07/05(日)',
    tabLabel: '7/4-5',
    startsOn: '2026-07-04',
    endsOn: '2026-07-05',
    events: [
      {
        id: '2026-07-04-lucie-rie',
        weekendKey: '2026-07-04',
        weekendLabel: '2026/07/04(土)-07/05(日)',
        tabLabel: '7/4-5',
        title: 'ルーシー・リー展 東西をつなぐ優美のうつわ',
        emoji: '🏺',
        categoryId: 'date',
        dateLabel: '7/4(土) 開幕',
        start: '2026-07-04T13:00:00+09:00',
        end: '2026-07-04T15:30:00+09:00',
        area: '白金台',
        locationName: '東京都庭園美術館',
        nearestStation: '白金台駅 / 目黒駅',
        price: '一般 1,400円',
        reservation: '日時指定予約制',
        tags: ['陶芸', '美術館', '庭園', '屋内'],
        summary:
          '20世紀を代表する陶芸家ルーシー・リーの約10年ぶりの国内回顧展。アール・デコ建築と庭園の空気まで含めて、ゆっくり見たい展示。',
        sourceName: '東京都庭園美術館公式',
        url: 'https://www.teien-art-museum.ne.jp/exhibition/lucie-rie/',
        imageUrl: 'https://www.teien-art-museum.ne.jp/wp-content/uploads/2025/12/lucierie_teien_B2poster_final.jpg',
        imageQuery: 'ルーシー・リー展 東京都庭園美術館',
      },
      {
        id: '2026-07-04-orihime-mizumachi',
        weekendKey: '2026-07-04',
        weekendLabel: '2026/07/04(土)-07/05(日)',
        tabLabel: '7/4-5',
        title: 'すみだ東京ミズマチ 七夕 おりひめ祭り',
        emoji: '🎋',
        categoryId: 'date',
        dateLabel: '7/4(土) 夕方',
        start: '2026-07-04T16:30:00+09:00',
        end: '2026-07-04T20:00:00+09:00',
        area: '本所吾妻橋・押上',
        locationName: '隅田公園そよ風ひろば',
        nearestStation: '本所吾妻橋駅 / とうきょうスカイツリー駅',
        price: '無料中心',
        reservation: '予約不要',
        tags: ['七夕', '夏祭り', '隅田川', '夜'],
        summary:
          '牛嶋神社と隅田公園を舞台に、巫女行列、七夕祈願、巫女舞、盆踊り、音楽ライブが続く七夕イベント。夕方から夜の川沿いがきれい。',
        sourceName: 'すみどこ',
        url: 'https://sumidoko.com/events/6cluznbp7uuwcbcnotkkp9/',
        imageUrl:
          'https://images.ctfassets.net/rbovwpwiapxl/77epy9N79KXmcXXnxHuwYk/98b288904512cd094372b66bab26c73e/2026-07-04_240d34bc-73e.webp?w=600&fm=webp&q=70',
        imageQuery: 'すみだ東京ミズマチ 七夕 おりひめ祭り',
      },
      {
        id: '2026-07-04-skytree-tanabata',
        weekendKey: '2026-07-04',
        weekendLabel: '2026/07/04(土)-07/05(日)',
        tabLabel: '7/4-5',
        title: '東京スカイツリー 七夕まわり',
        emoji: '🗼',
        categoryId: 'date',
        dateLabel: '7/4(土)-7/5(日)',
        start: '2026-07-05T14:00:00+09:00',
        end: '2026-07-05T17:00:00+09:00',
        area: '押上',
        locationName: '東京スカイツリータウン',
        nearestStation: '押上駅 / とうきょうスカイツリー駅',
        price: '店舗・展望台利用による',
        reservation: '展望台はチケット確認',
        tags: ['七夕', 'スカイツリー', '買い物', '屋内'],
        summary:
          'ソラマチの七夕飾りや限定スイーツを見ながら、天気に合わせて展望台・水族館・カフェへ切り替えられる押上プラン。',
        sourceName: 'レッツエンジョイ東京',
        url: 'https://www.enjoytokyo.jp/feature/matsuri_summer/tanabata_tokyo/',
        imageUrl:
          'https://rstatic.enjoytokyo.jp/assets/images/feature/f31c7ff062936a96d3c8bd1f8f2ff3/15/thumbnail.jpg?1780629304&p=t&w=1200',
        imageQuery: '東京スカイツリー 七夕 ソラマチ',
      },
    ],
  },
];

function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function upcomingWeekendEventGroups(now = new Date()): WeekendEventGroup[] {
  const today = toDateOnly(now);
  return MONTHLY_WEEKEND_EVENTS.filter((group) => group.endsOn >= today).slice(0, 4);
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
    rainFriendly: item.tags.includes('屋内'),
    tags: item.tags,
    summary: item.summary,
    coupleNote: item.summary,
    sourceName: item.sourceName,
    url: item.url,
    imageUrl: item.imageUrl ?? null,
  };
}
