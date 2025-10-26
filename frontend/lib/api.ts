// API client for communicating with the backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    // Get token from localStorage on client side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth-token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth-token', token);
      } else {
        localStorage.removeItem('auth-token');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async register(userData: {
    username: string;
    displayName: string;
    email: string;
    password: string;
    bio?: string;
    avatar?: string;
  }) {
    const response = await this.request<{
      success: boolean;
      user: any;
      token: string;
      message: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async login(credentials: { email: string; password: string }) {
    const response = await this.request<{
      success: boolean;
      user?: any;
      token?: string;
      twoFactorRequired?: boolean;
      userHint?: any;
      message: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    const response = await this.request<{ success: boolean; message: string }>(
      '/api/auth/logout',
      {
        method: 'POST',
      }
    );

    this.setToken(null);
    return response;
  }

  async getCurrentUser() {
    return this.request<{ success: boolean; user: any }>('/api/auth/me');
  }

  // Thread endpoints
  async getThreads(params: {
    limit?: number;
    offset?: number;
    userId?: string;
    feedType?: 'following' | 'all';
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request<{ success: boolean; threads: any[] }>(
      `/api/threads?${searchParams.toString()}`
    );
  }

  async createThread(threadData: {
    content: string;
    visibility?: string;
    attachments?: string[];
    parentId?: string;
    groupId?: string;
    topicDayId?: string;
  }) {
    return this.request<{ success: boolean; thread: any; message: string }>(
      '/api/threads',
      {
        method: 'POST',
        body: JSON.stringify(threadData),
      }
    );
  }

  async updateThread(threadId: string, action: 'like' | 'unlike' | 'dislike' | 'undislike') {
    return this.request<{ success: boolean; thread: any; message: string }>(
      `/api/threads/${threadId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ action }),
      }
    );
  }

  async deleteThread(threadId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/api/threads/${threadId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // User endpoints
  async getUsers() {
    return this.request<{ success: boolean; users: any[] }>('/api/users');
  }

  async getUser(userId: string) {
    return this.request<{ success: boolean; user: any }>(`/api/users/${userId}`);
  }

  async followUser(userId: string) {
    return this.request<{ success: boolean; message: string }>('/api/users/follow', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async getFollowers() {
    return this.request<{ success: boolean; followers: any[] }>('/api/users/followers');
  }

  async getFollowing() {
    return this.request<{ success: boolean; following: any[] }>('/api/users/following');
  }

  // Group endpoints
  async getGroups() {
    return this.request<{ success: boolean; groups: any[] }>('/api/groups');
  }

  async createGroup(groupData: {
    name: string;
    description: string;
    visibility?: 'public' | 'private';
  }) {
    return this.request<{ success: boolean; group: any; message: string }>(
      '/api/groups',
      {
        method: 'POST',
        body: JSON.stringify(groupData),
      }
    );
  }

  async getGroup(groupId: string) {
    return this.request<{ success: boolean; group: any }>(`/api/groups/${groupId}`);
  }

  async joinGroup(groupId: string) {
    return this.request<{ success: boolean; message: string }>('/api/groups/join', {
      method: 'POST',
      body: JSON.stringify({ groupId }),
    });
  }

  async inviteToGroup(groupId: string, userId: string) {
    return this.request<{ success: boolean; message: string }>('/api/groups/invite', {
      method: 'POST',
      body: JSON.stringify({ groupId, userId }),
    });
  }

  // Notification endpoints
  async getNotifications() {
    return this.request<{ success: boolean; notifications: any[] }>('/api/notifications');
  }

  async markAllNotificationsAsRead() {
    return this.request<{ success: boolean; message: string }>(
      '/api/notifications/read-all',
      {
        method: 'POST',
      }
    );
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/api/notifications/${notificationId}/read`,
      {
        method: 'POST',
      }
    );
  }

  // Weather endpoints
  async getWeather() {
    return this.request<{ success: boolean; weather: any }>('/api/weather');
  }

  // Upload endpoints
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<{ success: boolean; message: string; url: string }>(
      '/api/upload',
      {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      }
    );
  }

  // Admin endpoints
  async getAdminData() {
    return this.request<{ success: boolean; data: any }>('/api/admin');
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
