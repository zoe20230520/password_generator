// 全局变量
let toast = null;

document.addEventListener('DOMContentLoaded', function() {
    // 初始化 Toast
    const toastEl = document.getElementById('toast');
    toast = new bootstrap.Toast(toastEl);

    // 检查是否已登录
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'index.html';
    }

    // 密码显示/隐藏切换
    document.getElementById('togglePassword').addEventListener('click', togglePasswordVisibility);

    // 登录表单提交
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
});

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('togglePassword');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash toggle-password';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye toggle-password';
    }
}

function showLoading() {
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>登录中...';
}

function hideLoading() {
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>登录';
}

function showToast(message, type = 'success') {
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    toastTitle.textContent = type === 'success' ? '成功' : (type === 'error' ? '错误' : '提示');
    toastMessage.textContent = message;

    toastIcon.className = type === 'success' ? 'fas fa-check-circle me-2 text-success' :
                          type === 'error' ? 'fas fa-exclamation-circle me-2 text-danger' :
                          'fas fa-info-circle me-2 text-info';

    toast.show();
}

function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

function clearAlert() {
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.innerHTML = '';
}

function handleLogin(event) {
    event.preventDefault();

    clearAlert();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showAlert('请填写用户名和密码');
        return;
    }

    showLoading();

    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 保存 token 和用户信息
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));

            showToast('登录成功，正在跳转...', 'success');

            // 延迟跳转
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showAlert(data.error || '登录失败');
            hideLoading();
        }
    })
    .catch(error => {
        console.error('登录错误:', error);
        showAlert('网络错误，请稍后重试');
        hideLoading();
    });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
