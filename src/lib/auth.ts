export type UserType = 'child' | 'parent' | null;

// セッション有効期間（12時間）
const SESSION_TIMEOUT = 12 * 60 * 60 * 1000;

export const getUserType = (): UserType => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userType') as UserType;
};

export const getAuthTime = (): number | null => {
  if (typeof window === 'undefined') return null;
  const authTime = localStorage.getItem('authTime');
  return authTime ? parseInt(authTime) : null;
};

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userType = getUserType();
  const authTime = getAuthTime();
  
  if (!userType || !authTime) {
    return false;
  }
  
  // セッションタイムアウト確認
  const now = Date.now();
  if (now - authTime > SESSION_TIMEOUT) {
    // セッション期限切れ
    clearUserType();
    return false;
  }
  
  return true;
};

export const setUserType = (userType: UserType) => {
  if (typeof window === 'undefined') return;
  if (userType) {
    localStorage.setItem('userType', userType);
    localStorage.setItem('authTime', Date.now().toString());
  } else {
    localStorage.removeItem('userType');
    localStorage.removeItem('authTime');
  }
};

export const clearUserType = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('userType');
  localStorage.removeItem('authTime');
};

export const isChildUser = (): boolean => {
  return isAuthenticated() && getUserType() === 'child';
};

export const isParentUser = (): boolean => {
  return isAuthenticated() && getUserType() === 'parent';
};

export const requireAuth = (requiredType: UserType): boolean => {
  if (!isAuthenticated()) return false;
  const currentUserType = getUserType();
  return currentUserType === requiredType;
};

export const refreshSession = () => {
  if (typeof window === 'undefined') return;
  const userType = getUserType();
  if (userType && isAuthenticated()) {
    localStorage.setItem('authTime', Date.now().toString());
  }
};