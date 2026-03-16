import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (data) => API.post('/auth/login', data);
export const createUser = (data) => API.post('/auth/create-user', data);
export const getUsers = () => API.get('/auth/users');
export const deleteUser = (id) => API.delete(`/auth/users/${id}`);
export const getMe = () => API.get('/auth/me');

// Workflows
export const getWorkflows = (page = 1) => API.get(`/workflows?page=${page}`);
export const getWorkflow = (id) => API.get(`/workflows/${id}`);
export const createWorkflow = (data) => API.post('/workflows', data);
export const updateWorkflow = (id, data) => API.put(`/workflows/${id}`, data);
export const deleteWorkflow = (id) => API.delete(`/workflows/${id}`);

// Steps
export const getSteps = (workflowId) => API.get(`/workflows/${workflowId}/steps`);
export const createStep = (workflowId, data) => API.post(`/workflows/${workflowId}/steps`, data);
export const updateStep = (id, data) => API.put(`/steps/${id}`, data);
export const deleteStep = (id) => API.delete(`/steps/${id}`);

// Rules
export const getRules = (stepId) => API.get(`/steps/${stepId}/rules`);
export const createRule = (stepId, data) => API.post(`/steps/${stepId}/rules`, data);
export const updateRule = (id, data) => API.put(`/rules/${id}`, data);
export const deleteRule = (id) => API.delete(`/rules/${id}`);

// Executions
export const executeWorkflow = (workflowId, data) => API.post(`/workflows/${workflowId}/execute`, { data });
export const getExecutions = (page = 1, filters = {}) => {
  const params = new URLSearchParams({ page, ...filters });
  return API.get(`/executions?${params}`);
};
export const getExecution = (id) => API.get(`/executions/${id}`);
export const cancelExecution = (id) => API.post(`/executions/${id}/cancel`);
export const retryExecution = (id) => API.post(`/executions/${id}/retry`);

// Tasks
export const getMyTaskCount = () => API.get('/tasks/my/count');
export const getMyTasks = (page = 1) => API.get(`/tasks/my?page=${page}`);
export const approveTask = (id) => API.post(`/tasks/${id}/approve`);
export const rejectTask = (id) => API.post(`/tasks/${id}/reject`);
export const startTask = (id) => API.post(`/tasks/${id}/start`);
export const completeTask = (id) => API.post(`/tasks/${id}/complete`);

// Notifications
export const getMyNotifications = () => API.get(`/notifications`);
export const getUnreadNotificationCount = () => API.get(`/notifications/unread-count`);
export const markNotificationAsRead = (id) => API.put(`/notifications/${id}/read`);
export const markAllNotificationsAsRead = () => API.put(`/notifications/read-all`);

export default API;
