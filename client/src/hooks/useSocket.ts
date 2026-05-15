import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/store/useAuthStore";

export interface QuestionOptionAnalytics {
  optionId: string;
  optionText: string;
  count: number;
  percentage: number;
}

export interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  isRequired: boolean;
  totalAnswers: number;
  options: QuestionOptionAnalytics[];
}

export interface ResponseCountPayload {
  pollId: string;
  totalResponses: number;
  timestamp: string;
}

export interface AnalyticsUpdatePayload {
  pollId: string;
  totalResponses: number;
  questions: QuestionAnalytics[];
  dailyTimeline: { date: string; count: number }[];
  anonymousCount: number;
  identifiedCount: number;
  timestamp: string;
}

export interface PollStatusPayload {
  pollId: string;
  timestamp: string;
}

export interface RoomJoinedPayload {
  pollId: string;
  socketId: string;
}

interface ServerToClientEvents {
  "poll:response-count": (payload: ResponseCountPayload) => void;
  "poll:analytics-update": (payload: AnalyticsUpdatePayload) => void;
  "poll:published": (payload: PollStatusPayload) => void;
  "poll:expired": (payload: PollStatusPayload) => void;
  "room:joined": (payload: RoomJoinedPayload) => void;
}

interface ClientToServerEvents {
  "join:poll": (pollId: string) => void;
  "join:poll:admin": (payload: { pollId: string; token: string }) => void;
  "leave:poll": (pollId: string) => void;
  "leave:poll:admin": (pollId: string) => void;
}

type PollSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

let socketSingleton: PollSocket | null = null;
let subscriberCount = 0;

const getSocket = (): PollSocket => {
  if (!socketSingleton) {
    socketSingleton = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 20000,
    });
  }
  return socketSingleton;
};

export interface UseSocketOptions {
  pollId: string;

  /** If true, joins the admin room (requires valid access token). */
  admin?: boolean;

  onResponseCount?: (payload: ResponseCountPayload) => void;
  onAnalyticsUpdate?: (payload: AnalyticsUpdatePayload) => void;
  onPollPublished?: (payload: PollStatusPayload) => void;
  onPollExpired?: (payload: PollStatusPayload) => void;
  onRoomJoined?: (payload: RoomJoinedPayload) => void;
}

export interface UseSocketReturn {
  isConnected: boolean;
}

export const useSocket = ({
  pollId,
  admin = false,
  onResponseCount,
  onAnalyticsUpdate,
  onPollPublished,
  onPollExpired,
  onRoomJoined,
}: UseSocketOptions): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState<boolean>(() => getSocket().connected);

  const handlersRef = useRef({
    onResponseCount,
    onAnalyticsUpdate,
    onPollPublished,
    onPollExpired,
    onRoomJoined,
  });

  useEffect(() => {
    handlersRef.current = {
      onResponseCount,
      onAnalyticsUpdate,
      onPollPublished,
      onPollExpired,
      onRoomJoined,
    };
  });

  useEffect(() => {
    subscriberCount++;

    const socket = getSocket();

    const handleResponseCount = (payload: ResponseCountPayload): void => {
      if (payload.pollId !== pollId) return;
      handlersRef.current.onResponseCount?.(payload);
    };

    const handleAnalyticsUpdate = (payload: AnalyticsUpdatePayload): void => {
      if (payload.pollId !== pollId) return;
      handlersRef.current.onAnalyticsUpdate?.(payload);
    };

    const handlePollPublished = (payload: PollStatusPayload): void => {
      if (payload.pollId !== pollId) return;
      handlersRef.current.onPollPublished?.(payload);
    };

    const handlePollExpired = (payload: PollStatusPayload): void => {
      if (payload.pollId !== pollId) return;
      handlersRef.current.onPollExpired?.(payload);
    };

    const handleRoomJoined = (payload: RoomJoinedPayload): void => {
      if (payload.pollId !== pollId) return;
      handlersRef.current.onRoomJoined?.(payload);
    };

    const joinRooms = (): void => {
      socket.emit("join:poll", pollId);
      if (admin) {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          socket.emit("join:poll:admin", { pollId, token });
        }
      }
    };

    const handleConnect = (): void => {
      setIsConnected(true);
      joinRooms();
    };
    const handleDisconnect = (): void => setIsConnected(false);
    const handleConnectError = (): void => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    if (!socket.connected) {
      socket.connect();
    } else {
      joinRooms();
    }

    // Subscribe to server events
    socket.on("poll:response-count", handleResponseCount);
    socket.on("poll:analytics-update", handleAnalyticsUpdate);
    socket.on("poll:published", handlePollPublished);
    socket.on("poll:expired", handlePollExpired);
    socket.on("room:joined", handleRoomJoined);

    return (): void => {
      socket.emit("leave:poll", pollId);
      if (admin) socket.emit("leave:poll:admin", pollId);

      socket.off("poll:response-count", handleResponseCount);
      socket.off("poll:analytics-update", handleAnalyticsUpdate);
      socket.off("poll:published", handlePollPublished);
      socket.off("poll:expired", handlePollExpired);
      socket.off("room:joined", handleRoomJoined);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);

      subscriberCount--;
      if (subscriberCount === 0) {
        socket.disconnect();
      }
    };
  }, [pollId, admin]);

  return { isConnected };
};
