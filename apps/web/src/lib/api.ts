export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000/api/v1';
    }
    return '/api/v1';
  }
  return 'http://localhost:4000/api/v1';
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function setStoredToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', token);
}

export function getStoredBrandId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('selected_brand_id');
}

export function setStoredBrandId(brandId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('selected_brand_id', brandId);
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const brandId = getStoredBrandId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (brandId) {
    headers['x-brand-id'] = brandId;
  }

  const baseUrl = getApiBaseUrl();
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (baseUrl.endsWith('/api/v1') && cleanEndpoint.startsWith('/api/v1')) {
    cleanEndpoint = cleanEndpoint.substring(7);
  }

  const res = await fetch(`${baseUrl}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `API Error ${res.status}`;
    try {
      const errorJson = await res.json();
      errorMsg = errorJson.message || errorJson.error || errorMsg;
    } catch (_) {}

    if (res.status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/') {
      localStorage.removeItem('access_token');
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      window.location.href = '/';
    }

    throw new Error(errorMsg);
  }

  return res.json();
}

// --- BRAND & USER API ---
export async function fetchMe() {
  return fetchApi<any>('/api/v1/auth/me');
}

export async function fetchBrands() {
  return fetchApi<any[]>('/api/v1/brands');
}

export async function createBrand(data: {
  name: string;
  code: string;
  logoUrl?: string;
  brandColor?: string;
  timezone?: string;
  botDescription?: string;
  botShortDescription?: string;
  botPhotoUrl?: string;
  adminEmail?: string;
}) {
  return fetchApi('/api/v1/brands', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBrand(
  id: string,
  data: {
    name?: string;
    logoUrl?: string;
    brandColor?: string;
    timezone?: string;
    botDescription?: string;
    botShortDescription?: string;
    botPhotoUrl?: string;
    adminEmail?: string;
  },
) {
  // botPhotoUrl base64 ise JSON body'den çıkar (ayrı upload endpoint'i kullanılmalı)
  const { botPhotoUrl, ...rest } = data;
  const bodyData = botPhotoUrl && botPhotoUrl.startsWith('data:') ? rest : data;
  return fetchApi(`/api/v1/brands/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(bodyData),
  });
}

/**
 * Bot profil fotoğrafını multipart/form-data olarak ayrı endpoint'e yükler.
 * Base64 JSON body limit sorununu tamamen bypass eder.
 */
export async function uploadBrandBotPhoto(brandId: string, file: File): Promise<any> {
  const token = getStoredToken();
  const brandId2 = getStoredBrandId();
  const baseUrl = getApiBaseUrl();

  const formData = new FormData();
  formData.append('photo', file);

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (brandId2) headers['x-brand-id'] = brandId2;

  const res = await fetch(`${baseUrl}/brands/${brandId}/upload-bot-photo`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function syncBrandBotProfiles(brandId: string) {
  return fetchApi(`/api/v1/brands/${brandId}/sync-bot-profiles`, {
    method: 'POST',
  });
}

export async function fetchBrandUsers(brandId: string) {
  return fetchApi<any[]>(`/api/v1/brands/${brandId}/users`);
}

export async function addUserToBrand(
  brandId: string,
  data: {
    email: string;
    username?: string;
    password: string;
    role?: string;
    firstName?: string;
    lastName?: string;
  },
) {
  return fetchApi(`/api/v1/brands/${brandId}/users`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// --- BOT API ---
export async function fetchBots(brandId?: string) {
  const query = brandId ? `?brandId=${brandId}` : '';
  return fetchApi<any[]>(`/api/v1/bots${query}`);
}

export async function fetchBotById(botId: string) {
  return fetchApi<any>(`/api/v1/bots/${botId}`);
}

export async function registerBot(data: {
  token: string;
  displayName?: string;
  brandId: string;
  startMessage?: string;
  startParseMode?: 'HTML' | 'MARKDOWN_V2';
  buttons?: any[];
  disableNotification?: boolean;
  description?: string;
  tags?: string[];
  status?: string;
}) {
  return fetchApi('/api/v1/bots/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBotSettings(
  botId: string,
  data: {
    token?: string;
    displayName?: string;
    brandId?: string;
    status?: string;
    startMessage?: string;
    startParseMode?: 'HTML' | 'MARKDOWN_V2';
    buttons?: any[];
    disableNotification?: boolean;
    description?: string;
    tags?: string[];
  },
) {
  return fetchApi(`/api/v1/bots/${botId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function queueBulkImportBots(data: {
  brandId?: string;
  csvContent: string;
}) {
  return fetchApi('/api/v1/bots/bulk-import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchBulkImportStatus(importId: string) {
  return fetchApi(`/api/v1/bots/bulk-import/${importId}/status`);
}

export async function cancelBulkImport(importId: string) {
  return fetchApi(`/api/v1/bots/bulk-import/${importId}/cancel`, {
    method: 'POST',
  });
}
export const cancelBulkImportJob = cancelBulkImport;
export const queueBulkImport = queueBulkImportBots;

export function getBulkImportFailedCsvUrl(importId: string): string {
  const token = getStoredToken();
  return `${getApiBaseUrl()}/bots/bulk-import/${importId}/failed-csv${token ? `?token=${token}` : ''}`;
}

export async function updateStartMessage(
  botId: string,
  data: {
    startMessage?: string;
    startParseMode?: 'HTML' | 'MARKDOWN_V2';
    buttons?: any[];
  },
) {
  return fetchApi(`/api/v1/bots/${botId}/start-message`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function simulateWebhook(botId: string, text: string = '/start campaign_test') {
  return fetchApi(`/webhook/test-simulate/${botId}`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// --- TEMPLATES API ---
export async function fetchTemplates(brandId?: string, activeOnly: boolean = false) {
  const queryParams = new URLSearchParams();
  if (brandId) queryParams.append('brandId', brandId);
  if (activeOnly) queryParams.append('activeOnly', 'true');
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchApi<any[]>(`/api/v1/templates${queryString}`);
}

export async function fetchTemplateById(id: string) {
  return fetchApi<any>(`/api/v1/templates/${id}`);
}

export async function createTemplate(data: {
  brandId?: string;
  name: string;
  description?: string;
  content: string;
  parseMode?: 'HTML' | 'MARKDOWN_V2';
  mediaType?: 'NONE' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  mediaUrl?: string;
  buttons?: any[];
  variables?: string[];
  isActive?: boolean;
}) {
  return fetchApi('/api/v1/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(
  id: string,
  data: {
    name?: string;
    description?: string;
    content?: string;
    parseMode?: 'HTML' | 'MARKDOWN_V2';
    mediaType?: 'NONE' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
    mediaUrl?: string;
    buttons?: any[];
    variables?: string[];
    isActive?: boolean;
  },
) {
  return fetchApi(`/api/v1/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function approveTemplate(id: string) {
  return fetchApi(`/api/v1/templates/${id}/approve`, { method: 'POST' });
}

export async function rejectTemplate(id: string, reason: string) {
  return fetchApi(`/api/v1/templates/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function deleteTemplate(id: string) {
  return fetchApi(`/api/v1/templates/${id}`, { method: 'DELETE' });
}

// --- BROADCAST LOGS API ---
export async function fetchBroadcastLogs(brandId?: string) {
  const query = brandId ? `?brandId=${brandId}` : '';
  return fetchApi<any[]>(`/api/v1/broadcast-logs${query}`);
}

// --- CAMPAIGN API ---
export async function fetchCampaigns(brandId?: string) {
  const query = brandId ? `?brandId=${brandId}` : '';
  return fetchApi<any[]>(`/api/v1/campaigns${query}`);
}

export async function fetchCampaignById(id: string) {
  return fetchApi<any>(`/api/v1/campaigns/${id}`);
}

export async function createCampaign(data: any) {
  return fetchApi('/api/v1/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCampaign(id: string, data: any) {
  return fetchApi(`/api/v1/campaigns/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function previewCampaign(data: { campaignId?: string; templateId?: string; customText?: string }) {
  return fetchApi('/api/v1/campaigns/preview', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function previewNextRuns(config: any) {
  return fetchApi('/api/v1/campaigns/preview-next-runs', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function estimateAudience(data: { brandId?: string; targetBotIds?: string[]; excludedBotIds?: string[] }) {
  return fetchApi('/api/v1/campaigns/estimate-audience', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function testSendCampaign(campaignId: string, testTelegramUserId: string) {
  return fetchApi(`/api/v1/campaigns/${campaignId}/test-send`, {
    method: 'POST',
    body: JSON.stringify({ testTelegramUserId }),
  });
}

export async function submitCampaignApproval(campaignId: string) {
  return fetchApi(`/api/v1/campaigns/${campaignId}/submit-approval`, { method: 'POST' });
}

export async function approveCampaign(campaignId: string) {
  return fetchApi(`/api/v1/campaigns/${campaignId}/approve`, { method: 'POST' });
}

export async function rejectCampaign(campaignId: string, reason: string) {
  return fetchApi(`/api/v1/campaigns/${campaignId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function fetchABTestReport(brandId?: string, campaignId?: string) {
  const queryParams = new URLSearchParams();
  if (brandId) queryParams.append('brandId', brandId);
  if (campaignId) queryParams.append('campaignId', campaignId);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return fetchApi<any>(`/api/v1/campaigns/ab-test-report${queryString}`);
}

export async function scheduleCampaign(campaignId: string, scheduledAt: string) {
  return fetchApi(`/api/v1/campaigns/${campaignId}/schedule`, {
    method: 'POST',
    body: JSON.stringify({ scheduledAt }),
  });
}

export async function dispatchCampaign(
  campaignId: string,
  data: {
    botId?: string;
    botIds?: string[];
    targetAllBots?: boolean;
    messageText?: string;
    parseMode?: 'HTML' | 'MARKDOWN_V2';
    buttons?: any[];
    templateId?: string;
  },
) {
  return fetchApi(`/api/v1/campaigns/${campaignId}/dispatch`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function pauseCampaign(campaignId: string) {
  return fetchApi(`/api/v1/campaigns/${campaignId}/pause`, { method: 'POST' });
}

export async function resumeCampaign(campaignId: string) {
  return fetchApi(`/api/v1/campaigns/${campaignId}/resume`, { method: 'POST' });
}

export async function cancelCampaign(campaignId: string) {
  return fetchApi(`/api/v1/campaigns/${campaignId}/cancel`, { method: 'POST' });
}

export async function duplicateCampaign(campaignId: string) {
  return fetchApi(`/api/v1/campaigns/${campaignId}/duplicate`, { method: 'POST' });
}

export async function archiveCampaign(campaignId: string) {
  return fetchApi(`/api/v1/campaigns/${campaignId}/archive`, { method: 'POST' });
}

export async function deleteCampaign(campaignId: string) {
  return fetchApi(`/api/v1/campaigns/${campaignId}`, { method: 'DELETE' });
}

export async function fetchCampaignResults(campaignId: string) {
  return fetchApi(`/api/v1/campaigns/${campaignId}/results`);
}

// --- ANALYTICS & SYSTEM API ---
export async function fetchOverviewMetrics(brandId?: string) {
  const query = brandId ? `?brandId=${brandId}` : '';
  return fetchApi<any>(`/api/v1/analytics/overview${query}`);
}

export async function fetchAdvancedOverviewMetrics(brandId?: string) {
  const query = brandId ? `?brandId=${brandId}` : '';
  return fetchApi<any>(`/api/v1/analytics/dashboard-advanced${query}`);
}

export async function fetchBotHealthCenter(brandId?: string) {
  const query = brandId ? `?brandId=${brandId}` : '';
  return fetchApi<any>(`/api/v1/bots/health-center${query}`);
}

export async function fetchBotHealthReport(botId: string) {
  return fetchApi<any>(`/api/v1/bots/${botId}/health-report`);
}

export async function triggerBotDiagnose(botId: string) {
  return fetchApi<any>(`/api/v1/bots/${botId}/diagnose`, { method: 'POST' });
}

export async function fetchBotReport(botId: string) {
  return fetchApi<any>(`/api/v1/analytics/bot-report/${botId}`);
}

export async function triggerEmergencyStop(scope: 'GLOBAL' | 'BRAND' = 'GLOBAL', confirmationText: string) {
  return fetchApi('/api/v1/system/emergency-stop', {
    method: 'POST',
    body: JSON.stringify({ scope, confirmationText }),
  });
}

// --- SUBSCRIBERS & SEGMENTS API ---
export async function fetchSubscribers(brandId?: string, search?: string, isBlocked?: boolean) {
  const params = new URLSearchParams();
  if (brandId) params.append('brandId', brandId);
  if (search) params.append('search', search);
  if (typeof isBlocked === 'boolean') params.append('isBlocked', String(isBlocked));
  return fetchApi<any[]>(`/api/v1/subscribers?${params.toString()}`);
}

export async function fetchSubscriberById(id: string) {
  return fetchApi<any>(`/api/v1/subscribers/${id}`);
}

export async function fetchSegments(brandId?: string) {
  const query = brandId ? `?brandId=${brandId}` : '';
  return fetchApi<any[]>(`/api/v1/segments${query}`);
}

export async function createSegment(data: { brandId?: string; name: string; description?: string; rulesJson?: any }) {
  return fetchApi<any>('/api/v1/segments', { method: 'POST', body: JSON.stringify(data) });
}

// --- SYSTEM & AUDIT LOGS API ---
export async function fetchAuditLogs(brandId?: string) {
  const query = brandId ? `?brandId=${brandId}` : '';
  return fetchApi<any[]>(`/api/v1/audit-logs${query}`);
}

export async function fetchSystemHealth() {
  return fetchApi<any>('/api/v1/system/health');
}

export async function fetchQueueStatus() {
  return fetchApi<any>('/api/v1/system/queues');
}

export async function fetchSystemAlerts() {
  return fetchApi<any[]>('/api/v1/system/alerts');
}

export async function fetchBackupLogs() {
  return fetchApi<any[]>('/api/v1/system/backups');
}

export async function createManualBackup() {
  return fetchApi<any>('/api/v1/system/backups/create', { method: 'POST' });
}

export async function fetchSystemSettings() {
  return fetchApi<any[]>('/api/v1/system/settings');
}

// --- PROFILE & SESSIONS API ---
export async function fetchProfile() {
  return fetchApi<any>('/api/v1/profile');
}

export async function updateProfile(data: { firstName?: string; lastName?: string; email?: string }) {
  return fetchApi<any>('/api/v1/profile', { method: 'PATCH', body: JSON.stringify(data) });
}

export async function changePassword(currentPass: string, newPass: string) {
  return fetchApi<any>('/api/v1/profile/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPass, newPass }),
  });
}

export async function toggle2FA(enable: boolean) {
  return fetchApi<any>('/api/v1/profile/2fa/toggle', {
    method: 'POST',
    body: JSON.stringify({ enable }),
  });
}

export async function setupTwoFactor() {
  return fetchApi<{ secret: string; qrCodeDataUrl: string }>('/api/v1/auth/2fa/setup', {
    method: 'POST',
  });
}

export async function verifyTwoFactorCode(code: string) {
  return fetchApi<any>('/api/v1/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function fetchActiveSessions() {
  return fetchApi<any[]>('/api/v1/profile/sessions');
}

export async function revokeSession(id: string) {
  return fetchApi<any>(`/api/v1/profile/sessions/${id}`, { method: 'DELETE' });
}

export async function updateBrandUser(
  brandId: string,
  userId: string,
  data: { role?: string; firstName?: string; lastName?: string; password?: string; isActive?: boolean },
) {
  return fetchApi<any>(`/api/v1/brands/${brandId}/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function removeBrandUser(brandId: string, userId: string) {
  return fetchApi<any>(`/api/v1/brands/${brandId}/users/${userId}`, {
    method: 'DELETE',
  });
}
