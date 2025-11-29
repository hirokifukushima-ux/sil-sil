export type UserType = 'master' | 'parent' | 'child' | null;

export interface AuthSession {
  userId: string;
  userType: UserType;
  email?: string;
  displayName?: string;
  parentId?: string;
  masterId?: string;
  organizationId?: string;
  authTime: number;
}

// セッション有効期間（12時間）
const SESSION_TIMEOUT = 12 * 60 * 60 * 1000;

// セッション管理
export const getAuthSession = (): AuthSession | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const sessionData = localStorage.getItem('authSession');
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData) as AuthSession;
    
    // セッションタイムアウト確認
    const now = Date.now();
    if (now - session.authTime > SESSION_TIMEOUT) {
      clearAuthSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('セッション取得エラー:', error);
    clearAuthSession();
    return null;
  }
};

export const getUserType = (): UserType => {
  const session = getAuthSession();
  return session?.userType || null;
};

export const getAuthTime = (): number | null => {
  const session = getAuthSession();
  return session?.authTime || null;
};

export const getUserId = (): string | null => {
  const session = getAuthSession();
  return session?.userId || null;
};

export const getParentId = (): string | null => {
  const session = getAuthSession();
  return session?.parentId || null;
};

export const getMasterId = (): string | null => {
  const session = getAuthSession();
  return session?.masterId || null;
};

export const getOrganizationId = (): string | null => {
  const session = getAuthSession();
  return session?.organizationId || null;
};

export const isAuthenticated = (): boolean => {
  const session = getAuthSession();
  return session !== null;
};

export const setAuthSession = (session: Omit<AuthSession, 'authTime'>) => {
  if (typeof window === 'undefined') return;
  
  const fullSession: AuthSession = {
    ...session,
    authTime: Date.now()
  };
  
  localStorage.setItem('authSession', JSON.stringify(fullSession));
  
  // 後方互換性のため、旧形式も保持
  localStorage.setItem('userType', session.userType || '');
  localStorage.setItem('authTime', Date.now().toString());
};

export const clearAuthSession = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authSession');
  
  // 後方互換性のため、旧形式もクリア
  localStorage.removeItem('userType');
  localStorage.removeItem('authTime');
};

// 後方互換性のため
export const setUserType = (userType: UserType) => {
  if (typeof window === 'undefined') return;
  if (userType) {
    // 最小限のセッション情報で設定
    setAuthSession({
      userId: `temp-${Date.now()}`,
      userType,
    });
  } else {
    clearAuthSession();
  }
};

export const clearUserType = () => {
  clearAuthSession();
};

export const isChildUser = (): boolean => {
  return isAuthenticated() && getUserType() === 'child';
};

export const isParentUser = (): boolean => {
  return isAuthenticated() && getUserType() === 'parent';
};

export const isMasterUser = (): boolean => {
  return isAuthenticated() && getUserType() === 'master';
};

export const requireAuth = (requiredType: UserType): boolean => {
  // デバッグモード：開発環境では認証をスキップ
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SKIP_AUTH === 'true') {
    console.log(`🔧 デバッグモード: ${requiredType}認証をスキップしています`);
    return true;
  }
  
  // 子アカウント用：URLパラメータからchildIdが指定されている場合は直接アクセスを許可
  if (requiredType === 'child' && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const childId = urlParams.get('childId');
    
    if (childId) {
      console.log(`👶 子アカウント直接アクセス: ${childId}`);
      
      // 自動的に子ユーザーとしてセッションを作成
      setAuthSession({
        userId: childId,
        userType: 'child',
        displayName: 'Child User',
      });
      
      return true;
    }
  }
  
  if (!isAuthenticated()) return false;
  const currentUserType = getUserType();
  return currentUserType === requiredType;
};

// 階層的アクセス制御（上位ユーザーは下位にアクセス可能）
export const hasAccessLevel = (requiredLevel: UserType): boolean => {
  if (!isAuthenticated()) return false;
  
  const currentUserType = getUserType();
  
  // デバッグモード
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SKIP_AUTH === 'true') {
    return true;
  }
  
  // アクセスレベルの階層: master > parent > child
  const levels = { master: 3, parent: 2, child: 1 };
  const currentLevel = levels[currentUserType as keyof typeof levels] || 0;
  const requiredLevelValue = levels[requiredLevel as keyof typeof levels] || 0;
  
  return currentLevel >= requiredLevelValue;
};

// 特定の親に属する子かチェック
export const canAccessChild = (childParentId: string): boolean => {
  const session = getAuthSession();
  if (!session) return false;
  
  // マスターは全てにアクセス可能
  if (session.userType === 'master') return true;
  
  // 親は自分の子にのみアクセス可能
  if (session.userType === 'parent') {
    return session.userId === childParentId;
  }
  
  return false;
};

// 特定の組織にアクセス可能かチェック
export const canAccessOrganization = (organizationId: string): boolean => {
  const session = getAuthSession();
  if (!session) return false;
  
  // マスターは自分の組織にアクセス可能
  if (session.userType === 'master') {
    return session.organizationId === organizationId;
  }
  
  // 親と子は所属組織にアクセス可能
  return session.organizationId === organizationId;
};

export const refreshSession = () => {
  const session = getAuthSession();
  if (session) {
    setAuthSession({
      userId: session.userId,
      userType: session.userType,
      email: session.email,
      displayName: session.displayName,
      parentId: session.parentId,
      masterId: session.masterId,
      organizationId: session.organizationId,
    });
  }
};