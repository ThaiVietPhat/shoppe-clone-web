'use client';

import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { getAccessToken } from '@/lib/api';
import { ChatMessage } from '@/types/api';

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL ?? 'ws://localhost:8080';

export function useChatSubscription(roomId: string | null, onMessage: (msg: ChatMessage) => void) {
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    if (!roomId) return;

    const client = new Client({
      brokerURL: `${WS_BASE}/ws`,
      connectHeaders: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
      reconnectDelay: 5000,
      beforeConnect: () => {
        client.connectHeaders = { Authorization: `Bearer ${getAccessToken() ?? ''}` };
      },
      onConnect: () => {
        client.subscribe(`/topic/chat/rooms/${roomId}`, (frame) => {
          try {
            const msg: ChatMessage = JSON.parse(frame.body);
            callbackRef.current(msg);
          } catch {
            /* ignore malformed frame */
          }
        });
      },
    });

    client.activate();
    return () => { client.deactivate(); };
  }, [roomId]);
}
