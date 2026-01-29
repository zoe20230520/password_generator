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

    // 密码强度实时显示
    document.getElementById('password').addEventListener('input', updatePasswordStrength);

    // 注册表单提交
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
});

function showLoading() {
    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>注册中...';
}

function hideLoading() {
    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>注册';
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

function calculatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 1;

    if (score <= 2) return { class: 'very-weak', label: '很弱', percent: 20 };
    if (score === 3) return { class: 'weak', label: '弱', percent: 40 };
    if (score === 4) return { class: 'medium', label: '中等', percent: 60 };
    if (score === 5) return { class: 'strong', label: '强', percent: 80 };
    return { class: 'very-strong', label: '很强', percent: 100 };
}

function updatePasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');

    if (!password) {
        strengthBar.style.width = '0';
        strengthText.textContent = '输入密码查看强度';
        return;
    }

    const strength = calculatePasswordStrength(password);
    strengthBar.className = 'strength-bar';
    strengthBar.classList.add(`strength-${strength.class}`);
    strengthBar.style.width = `${strength.percent}%`;
    strengthText.textContent = strength.label;
}

function handleRegister(event) {
    event.preventDefault();

    clearAlert();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;

    // 验证用户名
    if (username.length < 3 || username.length > 20) {
        showAlert('用户名长度必须在3-20个字符之间');
        return;
    }

    // 验证邮箱
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('请输入有效的邮箱地址');
        return;
    }

    // 验证密码
    if (password.length < 6) {
        showAlert('密码长度至少为6个字符');
        return;
    }

    // 验证确认密码
    if (password !== confirmPassword) {
        showAlert('两次输入的密码不一致');
        return;
    }

    // 验证同意条款
    if (!agreeTerms) {
        showAlert('请阅读并同意服务条款');
        return;
    }

    showLoading();

    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('注册成功，正在跳转到登录页面...', 'success');

            // 延迟跳转
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showAlert(data.error || '注册失败');
            hideLoading();
        }
    })
    .catch(error => {
        console.error('注册错误:', error);
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
