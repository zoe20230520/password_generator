// 认证辅助函数

/**
 * 获取存储的 token
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * 设置 token
 */
function setToken(token) {
    localStorage.setItem('token', token);
}

/**
 * 移除 token
 */
function removeToken() {
    localStorage.removeItem('token');
}

/**
 * 获取当前用户信息
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * 设置当前用户信息
 */
function setCurrentUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

/**
 * 移除当前用户信息
 */
function removeCurrentUser() {
    localStorage.removeItem('user');
}

/**
 * 检查是否已登录
 */
function isLoggedIn() {
    return !!getToken();
}

/**
 * 退出登录
 */
function logout() {
    removeToken();
    removeCurrentUser();
    window.location.href = 'login.html';
}

/**
 * 带认证的 fetch 请求
 */
function authenticatedFetch(url, options = {}) {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return Promise.reject(new Error('未登录'));
    }

    // 添加认证头
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${token}`;

    return fetch(url, options);
}

/**
 * 检查登录状态，未登录则跳转到登录页
 */
function checkAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
    }
}

/**
 * 处理 401 未授权错误
 */
function handleUnauthorized() {
    showToast('登录已过期，请重新登录', 'error');
    logout();
}
