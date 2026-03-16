import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getMyNotifications, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead, getMyTaskCount } from '../services/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const fetchInitialData = async () => {
      try {
        const [countRes, notifRes, taskCountRes] = await Promise.all([
          getUnreadNotificationCount(),
          getMyNotifications(),
          getMyTaskCount()
        ]);
        setUnreadCount(countRes.data.count);
        setNotifications(notifRes.data);
        setTaskCount(taskCountRes.data.count);
      } catch (err) {
        console.error('Failed to fetch notifications/tasks', err);
      }
    };

    fetchInitialData();

    if (socket) {
      socket.on('new_notification', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      socket.on('task_count_update', async () => {
        try {
          const res = await getMyTaskCount();
          setTaskCount(res.data.count);
        } catch (err) {
          console.error(err);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('new_notification');
        socket.off('task_count_update');
      }
    };
  }, [user, socket]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setNotifications(notifications.map(n => n._id === id ? { ...n, is_read: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const isActive = (path) => location.pathname.startsWith(path);

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/"><i className="bi bi-lightning-fill" style={{ color: 'var(--accent)', marginRight: '6px' }}></i>WorkflowOS</Link>
      </div>
      <div className="navbar-links">
        <Link to="/workflows" className={isActive('/workflows') ? 'active' : ''}>Workflows</Link>
        <Link to="/executions" className={isActive('/executions') ? 'active' : ''}>Executions</Link>
        <Link to="/tasks" className={`nav-task-link ${isActive('/tasks') ? 'active' : ''}`}>
          Tasks
          {taskCount > 0 && <span className="nav-badge">{taskCount}</span>}
        </Link>
        {user.role === 'admin' && (
          <Link to="/users" className={isActive('/users') ? 'active' : ''}>Users</Link>
        )}
      </div>
      <div className="navbar-user">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '12px' }}>
          <div className="notification-wrapper" ref={dropdownRef} style={{ margin: 0 }}>
            <button className="btn-bell" onClick={() => setShowDropdown(!showDropdown)}>
              <i className="bi bi-bell-fill"></i>
              {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
            </button>
            
            {showDropdown && (
              <div className="notification-dropdown">
                <div className="notif-header">
                  <h4>Notifications</h4>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="btn btn-xs">Mark all read</button>
                  )}
                </div>
                <div className="notif-body">
                  {notifications.length === 0 ? (
                    <div className="notif-empty">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n._id} className={`notif-item ${!n.is_read ? 'unread' : ''}`} onClick={() => navigate('/tasks')}>
                        <div className="notif-content">
                          <strong>{n.title}</strong>
                          <p>{n.message}</p>
                          <span className="notif-time">{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                        {!n.is_read && (
                          <button className="btn-mark-read" onClick={(e) => handleMarkAsRead(n._id, e)} title="Mark as Read">
                            <i className="bi bi-check2"></i>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '4px 8px' }} title="Logout">
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="user-badge">{user.role}</span>
          <span className="user-name">{user.name}</span>
        </div>
      </div>
    </nav>
  );
}
