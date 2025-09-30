import { type FormEvent, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MessageCircle,
  X,
  Send,
  Users,
  UserPlus,
  Link as LinkIcon,
} from 'lucide-react';

type Message = {
  id: number;
  author: 'me' | 'guest';
  text: string;
  timestamp: Date;
};

type Invitation = {
  id: number;
  contact: string;
  status: 'pending' | 'sent';
};

function useContextSummary() {
  const location = useLocation();

  return useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const segments = location.pathname.split('/').filter(Boolean);

    let projectId = searchParams.get('project') ?? undefined;
    let subjectId = searchParams.get('subject') ?? undefined;
    let experimentId = searchParams.get('experiment') ?? undefined;

    if (segments.length > 0) {
      const [first, second, third, fourth] = segments;

      if (first === 'projects' && second) {
        projectId = decodeURIComponent(second);
      }

      if (first === 'subjects') {
        if (segments.length >= 3) {
          projectId = decodeURIComponent(second ?? projectId ?? '');
          subjectId = decodeURIComponent(third ?? subjectId ?? '');
        }
      }

      if (first === 'experiments') {
        if (segments.length >= 4) {
          projectId = decodeURIComponent(second ?? projectId ?? '');
          subjectId = decodeURIComponent(third ?? subjectId ?? '');
          experimentId = decodeURIComponent(fourth ?? experimentId ?? '');
        }
      }

      if (first === 'viewer' && segments.length >= 3) {
        projectId = decodeURIComponent(second ?? projectId ?? '');
        experimentId = decodeURIComponent(third ?? experimentId ?? '');
      }
    }

    const hasContext = projectId || subjectId || experimentId;

    const summaryParts = [
      projectId ? `Project: ${projectId}` : undefined,
      subjectId ? `Subject: ${subjectId}` : undefined,
      experimentId ? `Session: ${experimentId}` : undefined,
    ].filter(Boolean);

    return {
      projectId,
      subjectId,
      experimentId,
      summary: hasContext
        ? summaryParts.join(' · ')
        : 'No specific project context detected',
      shareUrl: `${window.location.origin}${location.pathname}${location.search}`,
    };
  }, [location]);
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inviteDraft, setInviteDraft] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const context = useContextSummary();

  const toggleWidget = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = messageDraft.trim();

    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        author: 'me',
        text: trimmed,
        timestamp: new Date(),
      },
    ]);

    setMessageDraft('');
  };

  const handleInvite = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = inviteDraft.trim();

    if (!trimmed) return;

    setInvitations((prev) => [
      ...prev,
      {
        id: Date.now(),
        contact: trimmed,
        status: 'sent',
      },
    ]);

    setInviteDraft('');
  };

  const handleCopyShareLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is not available');
      }

      await navigator.clipboard.writeText(context.shareUrl);
      setInvitations((prev) => [
        ...prev,
        {
          id: Date.now(),
          contact: context.shareUrl,
          status: 'sent',
        },
      ]);
    } catch (error) {
      console.error('Unable to copy link to clipboard', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="w-80 sm:w-96 bg-white shadow-2xl rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <p className="text-sm font-semibold">Project Chat</p>
                <p className="text-xs text-blue-100">{context.summary}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleWidget}
              className="p-1 rounded-full hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-600 focus:ring-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
            <div className="flex items-start space-x-2 text-sm text-blue-900">
              <Users className="w-4 h-4 mt-0.5" />
              <p>
                Invite colleagues to collaborate on this context. Share the link or send a direct invitation to start the
                discussion.
              </p>
            </div>
            <form className="mt-3 space-y-2" onSubmit={handleInvite}>
              <div className="flex rounded-md shadow-sm">
                <input
                  type="email"
                  value={inviteDraft}
                  onChange={(event) => setInviteDraft(event.target.value)}
                  className="flex-1 rounded-l-md border border-gray-200 px-3 py-2 text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Invite by email"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-r-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite
                </button>
              </div>
            </form>
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <LinkIcon className="w-4 h-4" /> Copy session link
            </button>
            {invitations.length > 0 && (
              <div className="mt-3 space-y-2 max-h-24 overflow-y-auto text-xs text-gray-600">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1"
                  >
                    <span className="truncate pr-2">{invite.contact}</span>
                    <span className="text-[10px] uppercase tracking-wide text-green-600">{invite.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-64 overflow-y-auto px-4 py-3 space-y-3 bg-white">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-gray-500 mt-6">
                No messages yet. Start the conversation by sending the first update.
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={message.author === 'me' ? 'text-right' : 'text-left'}>
                  <div
                    className={`inline-block rounded-lg px-3 py-2 text-sm ${
                      message.author === 'me'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p>{message.text}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide opacity-70">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex rounded-lg shadow-sm">
              <input
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                placeholder="Share an update"
                className="flex-1 rounded-l-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-r-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={toggleWidget}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <MessageCircle className="w-5 h-5" />
          Project Chat
        </button>
      )}
    </div>
  );
}
