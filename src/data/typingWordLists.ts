/**
 * High-frequency word lists used by the typing trainer.
 *
 * These are the fallback source. The trainer prefers the learner's own
 * vocabulary (notebook entries and review items) so typing practice reinforces
 * what they are actually studying; these lists cover the case where a learner
 * has not saved enough words yet, and give every supported language a usable
 * test on day one.
 *
 * Each list is common everyday vocabulary for the language, chosen so a test
 * drawn from it reads like plausible text rather than a random dictionary
 * sample. Diacritics are kept — typing them is part of the skill.
 */

export interface TypingWordList {
  /**
   * Characters counted as one "word" for WPM. Five is the long-standing
   * standard for alphabetic scripts. Logographic scripts count each character,
   * so their score is effectively characters-per-minute — comparing a Chinese
   * WPM against a Spanish one is meaningless either way.
   */
  charsPerWord: number;
  /** Whether typing this language normally goes through an IME. */
  usesInputMethod: boolean;
  direction: 'ltr' | 'rtl';
  words: string[];
}

const ENGLISH =
  `the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us`;

const SPANISH =
  `de la que el en y a los se del las un por con no una su para es al lo como más pero sus le ya o este sí porque esta entre cuando muy sin sobre también me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos esto antes algunos qué unos yo otro otras otra él tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros mi mis tú te ti tu tus ellas vosotros mío mía tuyo tuya suyo suya nuestro nuestra vuestro vuestra esos esas casa tiempo día vida hombre mundo año parte trabajo agua manos gente forma mujer cosa noche puerta ciudad libro palabra grupo país problema momento`;

const FRENCH =
  `de le et à un il être en avoir que pour dans ce son une sur avec ne se pas tout plus par grand comme mais nous ou si leur encore fois vous nouveau aller cela entre premier vouloir déjà grâce falloir raison depuis venir pendant passer petit trouver connaître demander rester penser part très savoir jamais chose vie temps homme jour monde femme main pays enfant heure année place mot moment maison fin ville soir ami eau feu terre ciel nuit matin école livre porte table voiture argent travail famille père mère frère sœur nom cœur tête pied corps yeux force paix guerre`;

const GERMAN =
  `der die und in den von zu das mit sich des auf für ist im dem nicht ein eine als auch es an werden aus er hat dass sie nach wird bei einer um am sind noch wie einem über einen so zum haben nur oder aber vor zur bis mehr durch man sein wurde hatte kann gegen vom können schon wenn habe seine ihre dann unter wir soll ich eines Jahr zwei Jahren diese dieser wieder keine Uhr seiner worden will zwischen immer was sagte Zeit Menschen Land Leben Arbeit Frau Mann Kind Haus Stadt Welt Tag Weg Hand Auge Wasser Buch Wort Freund Familie Schule Straße Geld Kraft Recht Grund Seite Teil Frage Antwort`;

const ITALIAN =
  `di che e il la un a per non in una è mi sono ho ma ha le si ci lo ti da cosa come io se qui hai lui no sei più mio ne fatto questo tu solo quando me te bene tutto anche stato voglio fare casa vita tempo uomo donna giorno anno mondo mano occhio parte lavoro amico padre madre figlio città paese acqua notte mattina sera strada porta libro scuola parola voce testa cuore forza modo posto momento numero gruppo storia famiglia gente pensiero bambino ragazzo denaro problema esempio ragione punto legge stanza campo`;

const PORTUGUESE =
  `de a o que e do da em um para com não uma os no se na por mais as dos como mas foi ao ele das tem à seu sua ou ser quando muito há nos já está eu também só pelo pela até isso ela entre era depois sem mesmo aos ter seus quem nas me esse eles estão você tinha foram essa num nem suas meu às minha numa pelos elas havia seja qual será nós tenho lhe deles essas esses pelas este dele casa tempo vida dia homem mulher mundo ano trabalho água mão parte forma coisa noite porta cidade livro palavra grupo país problema momento`;

const RUSSIAN =
  `и в не на я быть он с что а по это она этот к но они мы как из у который то за свой год от так о для ты же все тот мочь человек какой или если время рука нет самый ни стать большой даже другой наш под где дело есть сам раз чтобы два там чем глаз жизнь первый день тут во ничто потом очень со хотеть ли при голова надо без видеть идти теперь тоже стоять друг дом сейчас можно после слово здесь думать место спросить через лицо тогда ведь хороший каждый новый жить должен смотреть вода земля мир работа город книга`;

const ARABIC =
  `في من على أن إلى عن مع هذا التي الذي كان قد ما لا هو هي كل بعد بين عند لكن أو إذا حتى قبل غير كما حيث لم لن سوف هناك هنا ذلك تلك الآن أيضا فقط جدا ربما دائما أبدا كيف متى أين لماذا الذين بعض جميع نفس مثل ضد خلال حول دون سنة يوم وقت رجل امرأة طفل بيت مدينة بلد عالم حياة عمل ماء يد عين رأس قلب باب كتاب مدرسة كلمة صوت طريق مال قوة حق سبب جزء سؤال جواب صديق عائلة أب أم أخ أخت اسم ليل صباح مساء`;

const CHINESE =
  `的 一 是 不 了 人 我 在 有 他 这 中 大 来 上 国 个 到 说 们 为 子 和 你 地 出 道 也 时 年 得 就 那 要 下 以 生 会 自 着 去 之 过 家 学 对 可 她 里 后 小 么 心 多 天 而 能 好 都 然 没 日 于 起 还 发 成 事 只 作 当 想 看 文 无 开 手 十 用 主 行 方 又 如 前 所 本 见 经 头 面 公 同 三 已 老 从 动 两 长 知 民 样 现 分 将 外 但 身 些 与 高 问 定 情 走 入 教 部 意 提 打 明 者 何 利 比 或 关 点 少 力 内 实 加 电 现在 时间 工作 学习 生活 问题 发展 经济 社会 国家 人民 世界 城市 学校 老师 学生 朋友 家庭 父亲 母亲 孩子 东西 地方 事情 办法 感觉 希望 开始 结束 认为 觉得 应该 可能 已经 因为 所以 如果 虽然 但是 而且 不断 经过 今年 一起 一般 干部 经验 表现 书记 进入 进行 自己 历史 通过 关系 许多 影响 这里 可以 他们 参加 政府 成功 能力 注意 革命 什么`;

const JAPANESE =
  `の に は を た が で て と し れ さ ある いる も する から な こと として い や など なっ ない この ため その あっ よう また もの という あり まで られ なる へ か だ これ によって により おり より による ず なり られる において ば なかっ なく しかし について せ だっ できる それ う ので なお のみ でき き つ における および いう さらに でも ら たり に関する たち ます ん なら に対して 特に せる 及び これら とき では にて ほか ながら うち そして とともに ただし それぞれ または 日本 時間 仕事 勉強 生活 問題 世界 学校 先生 学生 友達 家族 父親 母親 子供 場所 気持ち 希望 開始 終了 必要 大切 簡単 難しい 新しい 古い 大きい 小さい 高い 安い 早い 遅い`;

const KOREAN =
  `이 그 저 것 수 등 및 년 월 일 때 곳 데 중 후 전 위 안 밖 앞 뒤 옆 사람 나라 사회 문제 경우 생각 정도 관계 자신 지역 여자 남자 학교 선생님 학생 친구 가족 아버지 어머니 아이 시간 오늘 내일 어제 아침 점심 저녁 지금 여기 거기 무엇 누구 어디 언제 어떻게 왜 하다 있다 되다 없다 보다 주다 가다 오다 알다 모르다 말하다 생각하다 만들다 사용하다 시작하다 끝나다 좋다 나쁘다 크다 작다 많다 적다 높다 낮다 빠르다 느리다 쉽다 어렵다 새롭다 이름 세계 나이 마음 사랑 행복 건강 공부 회사 도시 나무 하늘 바다 물 불 땅 책 문 길 돈 힘`;

const toWords = (source: string): string[] => source.split(/\s+/).filter(Boolean);

export const typingWordLists: Record<string, TypingWordList> = {
  en: { charsPerWord: 5, usesInputMethod: false, direction: 'ltr', words: toWords(ENGLISH) },
  es: { charsPerWord: 5, usesInputMethod: false, direction: 'ltr', words: toWords(SPANISH) },
  fr: { charsPerWord: 5, usesInputMethod: false, direction: 'ltr', words: toWords(FRENCH) },
  de: { charsPerWord: 5, usesInputMethod: false, direction: 'ltr', words: toWords(GERMAN) },
  it: { charsPerWord: 5, usesInputMethod: false, direction: 'ltr', words: toWords(ITALIAN) },
  pt: { charsPerWord: 5, usesInputMethod: false, direction: 'ltr', words: toWords(PORTUGUESE) },
  ru: { charsPerWord: 5, usesInputMethod: false, direction: 'ltr', words: toWords(RUSSIAN) },
  ar: { charsPerWord: 5, usesInputMethod: false, direction: 'rtl', words: toWords(ARABIC) },
  zh: { charsPerWord: 1, usesInputMethod: true, direction: 'ltr', words: toWords(CHINESE) },
  ja: { charsPerWord: 1, usesInputMethod: true, direction: 'ltr', words: toWords(JAPANESE) },
  ko: { charsPerWord: 2, usesInputMethod: true, direction: 'ltr', words: toWords(KOREAN) },
};

export function typingWordListForLanguage(code: string): TypingWordList {
  return typingWordLists[code] ?? typingWordLists.en;
}
