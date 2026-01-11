import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Teacher, Student, Notification } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { BellIcon } from './icons';

interface NotificationBellProps {
  user: Teacher | Student;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ user }) => {
    const [notifications, setNotifications] = useLocalStorage<Notification[]>('notifications', []);
    const [isOpen, setIsOpen] = useState(false);
    const bellRef = useRef<HTMLDivElement>(null);

    const userNotifications = useMemo(() => {
        return notifications
            .filter(n => n.userId === user.id)
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [notifications, user.id]);

    const unreadCount = useMemo(() => {
        return userNotifications.filter(n => !n.isRead).length;
    }, [userNotifications]);

    const handleMarkAsRead = (notificationId: string) => {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    };
    
    const handleMarkAllAsRead = () => {
        setNotifications(prev => prev.map(n => n.userId === user.id ? { ...n, isRead: true } : n));
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [bellRef]);
    
    const isTeacher = user.role === 'teacher';
    const theme = {
        bgColor: isTeacher ? 'bg-gray-700' : 'bg-surface',
        borderColor: isTeacher ? 'border-gray-600' : 'border-gray-200',
        textColor: isTeacher ? 'text-white' : 'text-textPrimary',
        secondaryTextColor: isTeacher ? 'text-gray-400' : 'text-textSecondary',
        hoverTextColor: isTeacher ? 'hover:text-white' : 'hover:text-textPrimary',
        linkColor: isTeacher ? 'text-blue-400' : 'text-primary',
        unreadBgColor: isTeacher ? 'bg-gray-800/50' : 'bg-blue-50',
    };

    return (
        <div className="relative" ref={bellRef}>
            <button onClick={() => setIsOpen(!isOpen)} className={`relative ${theme.secondaryTextColor} ${theme.hoverTextColor}`}>
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {unreadCount}
                    </span>
                )}
            </button>
            {isOpen && (
                <div className={`absolute right-0 mt-2 w-80 ${theme.bgColor} border ${theme.borderColor} rounded-md shadow-lg z-20 ${theme.textColor}`}>
                    <div className={`p-2 flex justify-between items-center border-b ${theme.borderColor}`}>
                      <h4 className="font-semibold text-sm">Notifications</h4>
                      <button onClick={handleMarkAllAsRead} className={`text-xs ${theme.linkColor} hover:underline`}>Mark all as read</button>
                    </div>
                    <ul className="max-h-96 overflow-y-auto">
                        {userNotifications.length > 0 ? userNotifications.map(n => (
                            <li key={n.id} className={`border-b ${theme.borderColor} last:border-b-0 p-3 text-sm ${!n.isRead ? theme.unreadBgColor : ''}`}>
                                <p>{n.message}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <span className={`text-xs ${theme.secondaryTextColor}`}>{new Date(n.timestamp).toLocaleString()}</span>
                                    {!n.isRead && <button onClick={() => handleMarkAsRead(n.id)} className={`text-xs ${theme.linkColor} hover:underline`}>Mark as read</button>}
                                </div>
                            </li>
                        )) : (
                          <p className={`p-4 text-center text-xs ${theme.secondaryTextColor}`}>No notifications yet.</p>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
