// 全局变量
let toast = null;
let currentUsername = '';
let backupFiles = [];

document.addEventListener('DOMContentLoaded', function() {
    // 初始化 Toast
    const toastEl = document.getElementById('toast');
    toast = new bootstrap.Toast(toastEl);

    // 检查是否已登录
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'index.html';
    }

    // 查找备份文件表单提交
    document.getElementById('forgotForm').addEventListener('submit', searchBackupFiles);
});

function showLoading() {
    const submitBtn = document.getElementById('searchBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>查找中...';
}

function hideLoading() {
    const submitBtn = document.getElementById('searchBtn');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-search me-2"></i>查找备份文件';
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

function searchBackupFiles(event) {
    event.preventDefault();

    clearAlert();

    currentUsername = document.getElementById('username').value.trim();

    if (!currentUsername) {
        showAlert('请输入用户名');
        return;
    }

    showLoading();

    fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUsername })
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();

        if (data.success) {
            backupFiles = data.data.backup_files;
            displayBackupList(data.data);
            goToStep2();
            showToast(`找到 ${backupFiles.length} 个备份文件`, 'success');
        } else {
            showAlert(data.error || '查找失败', 'warning');
        }
    })
    .catch(error => {
        console.error('查找错误:', error);
        hideLoading();
        showAlert('网络错误，请稍后重试');
    });
}

function displayBackupList(data) {
    const backupList = document.getElementById('backupList');
    backupList.innerHTML = `
        <div class="mb-3">
            <small class="text-white-50">
                <i class="fas fa-info-circle me-1"></i>
                用户名: ${data.username} | 邮箱: ${data.email}
            </small>
        </div>
    `;

    if (data.backup_files && data.backup_files.length > 0) {
        data.backup_files.forEach((backup, index) => {
            const item = document.createElement('div');
            item.className = 'backup-item';
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1 text-white">
                            <i class="fas fa-file-alt me-2 text-primary"></i>
                            备份文件 ${index + 1}
                        </h6>
                        <small class="text-white-50">
                            <i class="fas fa-clock me-1"></i>创建时间: ${backup.created_at}
                        </small>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="viewBackupFile('${backup.filename}')">
                        <i class="fas fa-eye me-1"></i>查看密码
                    </button>
                </div>
            `;
            backupList.appendChild(item);
        });
    } else {
        backupList.innerHTML += `
            <div class="text-center text-white-50 py-4">
                <i class="fas fa-folder-open fa-3x mb-3"></i>
                <p>未找到备份文件</p>
            </div>
        `;
    }
}

function viewBackupFile(filename) {
    showLoading();

    fetch(`/api/auth/backup-file/${encodeURIComponent(currentUsername)}/${encodeURIComponent(filename)}`)
        .then(response => response.json())
        .then(data => {
            hideLoading();

            if (data.success) {
                document.getElementById('backupContent').textContent = data.data.content;
                goToStep3();
                showToast('备份文件加载成功', 'success');
            } else {
                showAlert(data.error || '加载失败', 'danger');
            }
        })
        .catch(error => {
            console.error('加载错误:', error);
            hideLoading();
            showAlert('网络错误，请稍后重试');
        });
}

function goToStep1() {
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'none';
    clearAlert();
}

function goToStep2() {
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    document.getElementById('step3').style.display = 'none';
}

function goToStep3() {
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'block';
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
