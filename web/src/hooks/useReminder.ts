import { useEffect, useRef, useCallback } from "react";
import type { Todo } from "../types/todo";

interface UseReminderOptions {
  todos: Todo[];
  onReminderTriggered: (todoIndex: number, todo: Todo) => void;
}

export function useReminder({ todos, onReminderTriggered }: UseReminderOptions) {
  const notifiedRef = useRef<Set<string>>(new Set());

  // 알림 권한 요청
  const requestPermission = useCallback(async () => {
    // Electron 환경이면 권한 요청 불필요
    if (window.electronAPI?.showNotification) {
      return true;
    }

    if (!("Notification" in window)) {
      console.warn("이 브라우저는 알림을 지원하지 않습니다.");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }, []);

  // 알림 표시
  const showNotification = useCallback((todo: Todo) => {
    // Electron 환경이면 네이티브 알림 사용
    if (window.electronAPI?.showNotification) {
      window.electronAPI.showNotification("📋 할 일 리마인더", todo.text);
      return;
    }

    // 웹 환경이면 Web Notification API 사용
    if (Notification.permission === "granted") {
      const notification = new Notification("📋 할 일 리마인더", {
        body: todo.text,
        icon: "/favicon.ico",
        tag: `reminder-${todo.text}-${todo.reminder}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 10초 후 자동 닫기
      setTimeout(() => notification.close(), 10000);
    }
  }, []);

  // 리마인더 체크
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();

      todos.forEach((todo, index) => {
        if (!todo.reminder || todo.completed) return;

        const reminderTime = new Date(todo.reminder);
        const key = `${todo.text}-${todo.reminder}`;

        // 이미 알림을 보낸 경우 스킵
        if (notifiedRef.current.has(key)) return;

        // 리마인더 시간이 지났거나 현재 시간인 경우 (1분 이내)
        const diffMs = now.getTime() - reminderTime.getTime();
        if (diffMs >= 0 && diffMs < 60000) {
          notifiedRef.current.add(key);
          showNotification(todo);
          onReminderTriggered(index, todo);
        }
      });
    };

    // 초기 권한 요청
    requestPermission();

    // 즉시 체크 + 30초마다 체크
    checkReminders();
    const interval = setInterval(checkReminders, 30000);

    return () => clearInterval(interval);
  }, [todos, onReminderTriggered, requestPermission, showNotification]);

  // 알림 권한 상태 반환
  const getPermissionStatus = useCallback(() => {
    if (window.electronAPI?.showNotification) return "granted";
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  }, []);

  return {
    requestPermission,
    getPermissionStatus,
  };
}
