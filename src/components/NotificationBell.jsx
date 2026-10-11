'use client';

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiBell, FiCheck, FiCheckCircle, FiX } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import {
  browserNotificationsAvailable,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from '../lib/browserNotifications';

const timeAgo = (value) => {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

export default function NotificationBell({
  notifications = [],
  onRead = () => {},
  onReadAll = () => {},
  onClear = () => {},
  onOpen,
  placement = 'bottom',
  className = '',
  buttonClassName = '',
  iconClassName = '',
  iconContainerClassName = '',
  showLabel = false,
  label = 'Notifications',
  mobileViewport = false,
  onOpenChange,
}) {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState('unknown');
  const router = useRouter();
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);
  const canRequest = browserNotificationsAvailable();
  const permissionState = permission === 'unknown' ? getBrowserNotificationPermission() : permission;

  const enableBrowserAlerts = async () => {
    const result = await requestBrowserNotificationPermission();
    setPermission(result);
  };

  const openNotification = (notification) => {
    onRead(notification.id);
    setOpen(false);
    onOpenChange?.(false);
    if (onOpen) onOpen(notification);
    else if (notification.url) router.push(notification.url);
  };
  const closePanel = () => {
    setOpen(false);
    onOpenChange?.(false);
  };

  const notificationPanel = open && (
    <>
      <button type="button" aria-label="Close notifications" className="fixed inset-0 z-[69] cursor-default" onClick={closePanel} />
      <section
        aria-label="Recent notifications"
        className={`${mobileViewport
          ? 'fixed z-[70]'
          : `absolute ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 z-[70] w-[min(23rem,calc(100vw-1rem))]`
        } flex max-h-[min(72dvh,34rem)] flex-col overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-[0_18px_55px_rgba(50,12,25,.2)]`}
        style={mobileViewport ? {
          left: 'max(0.5rem, env(safe-area-inset-left))',
          right: 'max(0.5rem, env(safe-area-inset-right))',
          bottom: 'calc(4.8rem + env(safe-area-inset-bottom))',
        } : undefined}
      >
        <header className="flex items-center justify-between border-b border-rose-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">{label}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{unreadCount ? `${unreadCount} new` : 'You’re all caught up'}</p>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button type="button" onClick={onReadAll} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[#a40d32] transition hover:bg-rose-50" aria-label="Mark all notifications as read">
                <span className="inline-flex items-center gap-1"><FiCheckCircle /> Read all</span>
              </button>
            )}
            <button type="button" onClick={closePanel} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><FiX /></button>
          </div>
        </header>

        {canRequest && permissionState !== 'granted' && (
          <div className="border-b border-rose-100 bg-rose-50/70 px-4 py-3">
            {permissionState === 'denied' ? (
              <p className="text-xs leading-5 text-slate-600">Browser alerts are blocked. Allow notifications for BELORELLA in your browser settings.</p>
            ) : (
              <button type="button" onClick={enableBrowserAlerts} className="flex w-full items-center justify-between gap-3 text-left text-xs font-semibold text-[#a40d32]">
                <span>Turn on browser alerts for orders and messages</span><FiBell className="shrink-0" />
              </button>
            )}
          </div>
        )}

        {notifications.length ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                onClick={() => openNotification(notification)}
                className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-rose-50/60 ${notification.read ? 'bg-white' : 'bg-rose-50/30'}`}
              >
                {notification.image ? (
                  <img src={notification.image} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-slate-100 bg-white object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#bd1238]"><FiBell size={18} /></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold leading-5 text-slate-900">{notification.title}</span>
                    {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#d70b3d]" aria-label="Unread" />}
                  </span>
                  <span className="mt-0.5 block whitespace-pre-line break-words text-xs leading-5 text-slate-600">{notification.body}</span>
                  <span className="mt-1 block text-[10px] font-medium text-slate-400">{timeAgo(notification.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center px-5 py-10 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-[#bd1238]"><FiCheck size={21} /></span>
            <p className="text-sm font-semibold text-slate-800">Nothing new yet</p>
            <p className="mt-1 text-xs text-slate-500">Order updates and messages will show up here.</p>
          </div>
        )}

        {notifications.length > 0 && (
          <footer className="border-t border-rose-100 px-4 py-2 text-right">
            <button type="button" onClick={onClear} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Clear notifications</button>
          </footer>
        )}
      </section>
    </>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          onOpenChange?.(nextOpen);
        }}
        aria-label={`${label}${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        className={`relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-700 transition hover:bg-rose-50 hover:text-[#bd1238] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${showLabel ? 'flex-col gap-1' : ''} ${buttonClassName}`}
      >
        {showLabel ? (
          <span className={`flex h-8 w-9 shrink-0 items-center justify-center rounded-xl ${iconContainerClassName}`}>
            <FiBell size={20} className={iconClassName} />
          </span>
        ) : (
          <FiBell size={20} className={iconClassName} />
        )}
        {showLabel && <span className="text-[9px] font-semibold leading-3">{label}</span>}
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#d70b3d] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {mobileViewport && notificationPanel && typeof document !== 'undefined'
        ? createPortal(notificationPanel, document.body)
        : notificationPanel}
    </div>
  );
}
