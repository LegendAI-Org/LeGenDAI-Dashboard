import ConversationsView from '@/components/ConversationsView';

// ארכיון המספר הישן (GreenAPI). לקריאה בלבד בכוונה: תשובה יוצאת תמיד מהמספר של
// מטא, ומענה מתוך שיחה ישנה היה מגיע ללקוח ממספר שהוא לא מכיר.
export default function HistoryPage() {
  return <ConversationsView channel="greenapi" readOnly title="וואטסאפ — המספר הישן" />;
}
