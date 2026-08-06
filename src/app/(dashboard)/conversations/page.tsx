import ConversationsView from '@/components/ConversationsView';

// המספר הרשמי החדש (Cloud API) — התיבה הפעילה שלייה עונה ממנה.
// הארכיון של המספר הישן יושב בעמוד נפרד: /history.
export default function ConversationsPage() {
  return <ConversationsView channel="meta" />;
}
