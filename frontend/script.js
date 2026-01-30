// 全局变量
let currentPage = 1;
let currentDeleteId = null;
let currentEditImageFilename = null;
let entryModal = null;
let viewModal = null;
let deleteModal = null;
let importModal = null;
let backupModal = null;
let toast = null;
let selectedIds = new Set();
let pendingImportData = null;
let pendingBackupData = null;
let useCustomBackupPath = false;

// 辅助函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
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

function calculateStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 1;

    if (score <= 2) return { class: 'extreme-weak', label: '极弱', percent: 20 };
    if (score === 3) return { class: 'weak', label: '弱', percent: 40 };
    if (score === 4) return { class: 'medium', label: '中等', percent: 60 };
    if (score === 5) return { class: 'strong', label: '强', percent: 80 };
    return { class: 'extreme-strong', label: '极强', percent: 100 };
}

// 密码生成
function generatePassword() {
    const length = document.getElementById('passwordLength').value;
    const useLetters = document.getElementById('useLetters').checked;
    const useNumbers = document.getElementById('useNumbers').checked;
    const useSymbols = document.getElementById('useSymbols').checked;

    if (!useLetters && !useNumbers && !useSymbols) {
        showToast('请至少选择一种字符类型', 'error');
        return;
    }

    showLoading();

    authenticatedFetch('/api/generate-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            length: parseInt(length),
            letters: useLetters,
            numbers: useNumbers,
            symbols: useSymbols
        })
    })
    .then(response => {
        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('未授权');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            document.getElementById('generatedPassword').value = data.data.password;
            updateStrengthIndicator(data.data.password);
            showToast('密码生成成功');
        } else {
            showToast(data.error || '生成失败', 'error');
        }
    })
    .catch(error => {
        if (error.message !== '未授权') {
            showToast('网络错误: ' + error.message, 'error');
        }
    })
    .finally(hideLoading);
}

function copyPassword() {
    const password = document.getElementById('generatedPassword').value;
    if (!password) {
        showToast('请先生成密码', 'error');
        return;
    }

    // 尝试使用现代Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(password).then(() => {
            showToast('密码已复制到剪贴板');
        }).catch(err => {
            // 失败时使用备用方法
            fallbackCopyText(password);
        });
    } else {
        // 浏览器不支持Clipboard API，使用备用方法
        fallbackCopyText(password);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showToast('密码已复制到剪贴板');
    } catch (err) {
        showToast('复制失败，请手动复制', 'error');
        console.error('复制失败:', err);
    }

    document.body.removeChild(textArea);
}

function updateStrengthIndicator(password) {
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    const strength = calculateStrength(password);

    strengthBar.className = 'progress-bar';
    strengthBar.classList.add(`strength-${strength.class}`);
    strengthBar.style.width = `${strength.percent}%`;
    strengthText.textContent = strength.label;
}

// 密码列表
function loadPasswords() {
    const search = document.getElementById('searchInput').value;
    const category = document.getElementById('categoryFilter').value;

    showLoading();

    authenticatedFetch(`/api/passwords?page=${currentPage}&per_page=20&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`)
        .then(response => {
            if (response.status === 401) {
                handleUnauthorized();
                throw new Error('未授权');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                renderPasswordList(data.data);
                renderPagination(data.total, data.pages, data.current_page);
                document.getElementById('totalCount').textContent = `${data.total} 条记录`;
            } else {
                showToast(data.error || '加载失败', 'error');
            }
        })
        .catch(error => {
            if (error.message !== '未授权') {
                showToast('网络错误: ' + error.message, 'error');
            }
        })
        .finally(hideLoading);
}

function renderPasswordList(passwords) {
    const tbody = document.getElementById('passwordList');
    tbody.innerHTML = '';

    if (passwords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">暂无数据</td></tr>';
        return;
    }

    passwords.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'fade-in';
        row.ondblclick = () => viewEntry(item.id);

        // 处理 strength 字段，从字符串转换为对象
        const strengthInfo = getStrengthInfo(item.strength || 'weak');

        row.innerHTML = `
            <td><input type="checkbox" class="entry-checkbox" data-id="${item.id}" onchange="toggleSelect(${item.id})"></td>
            <td><strong>${escapeHtml(item.site_name)}</strong>${item.site_url ? `<br><small class="text-muted">${escapeHtml(item.site_url)}</small>` : ''}</td>
            <td>${escapeHtml(item.username)}</td>
            <td>${item.category ? `<span class="badge bg-light text-dark">${escapeHtml(item.category)}</span>` : '<span class="text-muted">-</span>'}</td>
            <td><span class="badge badge-strength badge-${strengthInfo.class}">${strengthInfo.label}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary btn-action" onclick="viewEntry(${item.id})" title="查看"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-outline-secondary btn-action" onclick="openEditModal(${item.id})" title="编辑"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="confirmDeleteModal(${item.id})" title="删除"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 辅助函数：将 strength 字符串转换为对象
function getStrengthInfo(strength) {
    const strengthMap = {
        'extreme-weak': { class: 'extreme-weak', label: '极弱' },
        'weak': { class: 'weak', label: '弱' },
        'medium': { class: 'medium', label: '中等' },
        'strong': { class: 'strong', label: '强' },
        'extreme-strong': { class: 'extreme-strong', label: '极强' }
    };
    return strengthMap[strength] || strengthMap['weak'];
}

function renderPagination(total, pages, current) {
    const pagination = document.getElementById('pagination').querySelector('ul');
    pagination.innerHTML = '';
    if (pages <= 1) return;

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${current === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="goToPage(${current - 1}); return false;">&laquo;</a>`;
    pagination.appendChild(prevLi);

    for (let i = 1; i <= pages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === current ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>`;
        pagination.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${current === pages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="goToPage(${current + 1}); return false;">&raquo;</a>`;
    pagination.appendChild(nextLi);
}

function goToPage(page) {
    currentPage = page;
    loadPasswords();
}

function loadCategories() {
    authenticatedFetch('/api/categories')
        .then(response => {
            if (response.status === 401) {
                handleUnauthorized();
                throw new Error('未授权');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                renderCategories(data.data);
            }
        })
        .catch(error => {
            if (error.message !== '未授权') {
                console.error('加载分类失败:', error);
            }
        });
}

function renderCategories(categories) {
    const filter = document.getElementById('categoryFilter');
    const dataList = document.getElementById('categoryList');

    while (filter.options.length > 1) {
        filter.remove(1);
    }
    dataList.innerHTML = '';

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        filter.appendChild(option);

        const dataOption = document.createElement('option');
        dataOption.value = category;
        dataList.appendChild(dataOption);
    });
}

// 模态框操作
function openCreateModal() {
    console.log('Opening create modal');
    document.getElementById('modalTitle').textContent = '添加密码';
    document.getElementById('entryForm').reset();
    document.getElementById('entryId').value = '';
    currentEditImageFilename = null;
    hideImagePreview();

    // 确保模态框被初始化
    if (!entryModal) {
        const entryModalEl = document.getElementById('entryModal');
        entryModal = new bootstrap.Modal(entryModalEl);
    }

    entryModal.show();
}

function openEditModal(id) {
    showLoading();

    authenticatedFetch(`/api/passwords/${id}`)
        .then(response => {
            if (response.status === 401) {
                handleUnauthorized();
                throw new Error('未授权');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const entry = data.data;
                document.getElementById('modalTitle').textContent = '编辑密码';
                document.getElementById('entryId').value = entry.id;
                document.getElementById('siteName').value = entry.site_name;
                document.getElementById('siteUrl').value = entry.site_url || '';
                document.getElementById('username').value = entry.username;
                document.getElementById('password').value = entry.password;
                document.getElementById('category').value = entry.category || '';
                document.getElementById('notes').value = entry.notes || '';
                currentEditImageFilename = entry.image_filename;

                if (entry.image_filename) {
                    showImagePreview(`/api/uploads/${entry.image_filename}`);
                } else {
                    hideImagePreview();
                }

                entryModal.show();
            } else {
                showToast(data.error || '加载失败', 'error');
            }
        })
        .catch(error => {
            if (error.message !== '未授权') {
                showToast('网络错误: ' + error.message, 'error');
            }
        })
        .finally(hideLoading);
}

function saveEntry() {
    const id = document.getElementById('entryId').value;
    const siteName = document.getElementById('siteName').value.trim();
    const siteUrl = document.getElementById('siteUrl').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const category = document.getElementById('category').value.trim();
    const notes = document.getElementById('notes').value.trim();

    if (!siteName || !username || !password) {
        showToast('网站名称、用户名和密码为必填字段', 'error');
        return;
    }

    const strength = calculateStrength(password);

    const data = {
        site_name: siteName,
        site_url: siteUrl,
        username: username,
        password: password,
        strength: strength.class,
        category: category,
        notes: notes,
        image_filename: currentEditImageFilename
    };

    showLoading();

    const url = id ? `/api/passwords/${id}` : '/api/passwords';
    const method = id ? 'PUT' : 'POST';

    authenticatedFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('未授权');
        }
        return response.json();
    })
    .then(responseData => {
        if (responseData.success) {
            showToast(id ? '更新成功' : '创建成功');
            entryModal.hide();
            loadPasswords();
            loadCategories();
        } else {
            showToast(responseData.error || '保存失败', 'error');
        }
    })
    .catch(error => {
        if (error.message !== '未授权') {
            showToast('网络错误: ' + error.message, 'error');
        }
    })
    .finally(hideLoading);
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const icon = document.getElementById('passwordToggleIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function useGeneratedPassword() {
    const generated = document.getElementById('generatedPassword').value;
    if (!generated) {
        showToast('请先生成密码', 'error');
        return;
    }
    document.getElementById('password').value = generated;
    updateStrengthIndicator(generated);
    showToast('密码已填入');
}

function viewEntry(id) {
    showLoading();

    authenticatedFetch(`/api/passwords/${id}`)
        .then(response => {
            if (response.status === 401) {
                handleUnauthorized();
                throw new Error('未授权');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const entry = data.data;
                const strength = calculateStrength(entry.password);
                const viewContent = document.getElementById('viewContent');

                viewContent.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <h6><i class="fas fa-globe"></i> 网站/应用</h6>
                            <p>${escapeHtml(entry.site_name)}</p>
                            ${entry.site_url ? `<h6><i class="fas fa-link"></i> 网站URL</h6><p><a href="${escapeHtml(entry.site_url)}" target="_blank">${escapeHtml(entry.site_url)}</a></p>` : ''}
                            <h6><i class="fas fa-user"></i> 用户名</h6>
                            <p>${escapeHtml(entry.username)}</p>
                            <h6><i class="fas fa-key"></i> 密码</h6>
                            <div class="input-group">
                                <input type="password" class="form-control" id="viewPassword" value="${escapeHtml(entry.password)}" readonly>
                                <button class="btn btn-outline-secondary" type="button" onclick="toggleViewPassword()">
                                    <i class="fas fa-eye" id="viewPasswordToggleIcon"></i>
                                </button>
                                <button class="btn btn-outline-secondary" type="button" onclick="copyViewPassword()">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6><i class="fas fa-tag"></i> 分类</h6>
                            <p>${entry.category ? `<span class="badge bg-light text-dark">${escapeHtml(entry.category)}</span>` : '<span class="text-muted">-</span>'}</p>
                            <h6><i class="fas fa-shield-alt"></i> 密码强度</h6>
                            <p><span class="badge badge-strength badge-${strength.class}">${strength.label}</span></p>
                            ${entry.image_filename ? `<h6><i class="fas fa-image"></i> 图片备忘</h6><img src="/api/uploads/${entry.image_filename}" alt="图片备忘" class="img-thumbnail" style="max-width: 200px;">` : ''}
                            <h6><i class="fas fa-clock"></i> 更新时间</h6>
                            <p>${new Date(entry.updated_at).toLocaleString('zh-CN')}</p>
                        </div>
                    </div>
                    ${entry.notes ? `<div class="mt-3"><h6><i class="fas fa-sticky-note"></i> 备注</h6><p>${escapeHtml(entry.notes).replace(/\n/g, '<br>')}</p></div>` : ''}
                `;

                document.getElementById('editFromViewBtn').onclick = () => {
                    viewModal.hide();
                    openEditModal(id);
                };

                viewModal.show();
            } else {
                showToast(data.error || '加载失败', 'error');
            }
        })
        .catch(error => {
            if (error.message !== '未授权') {
                showToast('网络错误: ' + error.message, 'error');
            }
        })
        .finally(hideLoading);
}

function toggleViewPassword() {
    const passwordInput = document.getElementById('viewPassword');
    const icon = document.getElementById('viewPasswordToggleIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function copyViewPassword() {
    const password = document.getElementById('viewPassword').value;
    navigator.clipboard.writeText(password).then(() => showToast('密码已复制到剪贴板'));
}

function confirmDeleteModal(id) {
    currentDeleteId = id;
    deleteModal.show();
}

function confirmDelete() {
    if (!currentDeleteId) return;

    showLoading();

    authenticatedFetch(`/api/passwords/${currentDeleteId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('未授权');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast('删除成功');
            deleteModal.hide();
            loadPasswords();
            loadCategories();
        } else {
            showToast(data.error || '删除失败', 'error');
        }
    })
    .catch(error => {
        if (error.message !== '未授权') {
            showToast('网络错误: ' + error.message, 'error');
        }
    })
    .finally(hideLoading);
}

// 图片处理
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('文件大小不能超过16MB', 'error');
        event.target.value = '';
        return;
    }

    showLoading();

    const formData = new FormData();
    formData.append('file', file);

    authenticatedFetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('未授权');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            currentEditImageFilename = data.data.filename;
            showImagePreview(data.data.url);
            showToast('图片上传成功');
        } else {
            showToast(data.error || '上传失败', 'error');
        }
    })
    .catch(error => {
        if (error.message !== '未授权') {
            showToast('网络错误: ' + error.message, 'error');
        }
    })
    .finally(hideLoading);
}

function showImagePreview(url) {
    const preview = document.getElementById('imagePreview');
    const container = document.getElementById('imagePreviewContainer');

    preview.src = url;
    container.style.display = 'block';
    
    // 确保图片加载完成
    preview.onload = function() {
        container.style.display = 'block';
    };
    
    preview.onerror = function() {
        showToast('图片加载失败', 'error');
        container.style.display = 'none';
    };
}

function hideImagePreview() {
    const container = document.getElementById('imagePreviewContainer');
    container.style.display = 'none';
}

function removeImage() {
    if (currentEditImageFilename) {
        showLoading();

        authenticatedFetch(`/api/upload/${currentEditImageFilename}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.status === 401) {
                handleUnauthorized();
                throw new Error('未授权');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                currentEditImageFilename = null;
                hideImagePreview();
                document.getElementById('imageUpload').value = '';
                showToast('图片已删除');
            } else {
                showToast(data.error || '删除失败', 'error');
            }
        })
        .catch(error => {
            if (error.message !== '未授权') {
                showToast('网络错误: ' + error.message, 'error');
            }
        })
        .finally(hideLoading);
    } else {
        hideImagePreview();
        document.getElementById('imageUpload').value = '';
    }
}

// 打开图片放大模态框
function openImageModal(imageSrc) {
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageSrc;
    
    const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
    imageModal.show();
}

function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
        logout();
    }
}

// 批量选择功能
function toggleSelect(id) {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
    } else {
        selectedIds.add(id);
    }
    updateBatchActions();
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.entry-checkbox');

    if (selectAll.checked) {
        checkboxes.forEach(cb => {
            selectedIds.add(parseInt(cb.dataset.id));
            cb.checked = true;
        });
    } else {
        checkboxes.forEach(cb => {
            selectedIds.delete(parseInt(cb.dataset.id));
            cb.checked = false;
        });
    }
    updateBatchActions();
}

function updateBatchActions() {
    const batchActions = document.getElementById('batchActions');
    const selectedCount = document.getElementById('selectedCount');
    const selectAll = document.getElementById('selectAll');

    selectedCount.textContent = selectedIds.size;

    if (selectedIds.size > 0) {
        batchActions.style.display = 'block';
    } else {
        batchActions.style.display = 'none';
        selectAll.checked = false;
    }
}

function clearSelection() {
    selectedIds.clear();
    document.querySelectorAll('.entry-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('selectAll').checked = false;
    updateBatchActions();
}

function batchDelete() {
    if (selectedIds.size === 0) {
        showToast('请先选择要删除的记录', 'error');
        return;
    }

    if (!confirm(`确定要删除选中的 ${selectedIds.size} 条记录吗？此操作无法撤销。`)) {
        return;
    }

    showLoading();

    authenticatedFetch('/api/passwords/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_ids: Array.from(selectedIds) })
    })
    .then(response => {
        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('未授权');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast(data.message);
            clearSelection();
            loadPasswords();
            loadCategories();
        } else {
            showToast(data.error || '删除失败', 'error');
        }
    })
    .catch(error => {
        if (error.message !== '未授权') {
            showToast('网络错误: ' + error.message, 'error');
        }
    })
    .finally(hideLoading);
}

// 导出功能
function exportPasswords() {
    showLoading();

    authenticatedFetch('/api/passwords/export')
        .then(response => {
            if (response.status === 401) {
                handleUnauthorized();
                throw new Error('未授权');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const jsonString = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `passwords_export_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(`成功导出 ${data.count} 条记录`);
            } else {
                showToast(data.error || '导出失败', 'error');
            }
        })
        .catch(error => {
            if (error.message !== '未授权') {
                showToast('网络错误: ' + error.message, 'error');
            }
        })
        .finally(hideLoading);
}

// 备份功能
function showBackupModal() {
    // 读取用户偏好设置
    const rememberLocation = localStorage.getItem('rememberBackupLocation') === 'true';
    const customPath = localStorage.getItem('useCustomBackupPath') === 'true';

    document.getElementById('rememberBackupLocation').checked = rememberLocation;

    if (rememberLocation) {
        // 如果用户选择了记住偏好，直接使用之前的设置
        if (customPath) {
            backupToCustom();
        } else {
            backupToDefault();
        }
    } else {
        // 显示模态框让用户选择
        if (!backupModal) {
            const backupModalEl = document.getElementById('backupModal');
            backupModal = new bootstrap.Modal(backupModalEl);
        }
        backupModal.show();
    }
}

function backupToDefault() {
    if (backupModal) {
        backupModal.hide();
    }

    // 保存用户偏好
    saveBackupPreference(false);

    performBackup();
}

function backupToCustom() {
    if (backupModal) {
        backupModal.hide();
    }

    // 保存用户偏好
    saveBackupPreference(true);

    // 检查浏览器是否支持 File System Access API
    if ('showSaveFilePicker' in window) {
        performBackupWithPicker();
    } else {
        // 不支持则使用默认方式
        performBackup();
        showToast('您的浏览器不支持自定义路径，已保存到默认下载位置', 'info');
    }
}

function saveBackupPreference(useCustom) {
    const remember = document.getElementById('rememberBackupLocation').checked;
    localStorage.setItem('rememberBackupLocation', remember.toString());
    if (remember) {
        localStorage.setItem('useCustomBackupPath', useCustom.toString());
    }
}

function performBackup() {
    showLoading();

    authenticatedFetch('/api/backup')
        .then(response => {
            if (response.status === 401) {
                handleUnauthorized();
                throw new Error('未授权');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const jsonString = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `password_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(`成功备份 ${data.data.count} 条记录`);
            } else {
                showToast(data.error || '备份失败', 'error');
            }
        })
        .catch(error => {
            if (error.message !== '未授权') {
                showToast('网络错误: ' + error.message, 'error');
            }
        })
        .finally(hideLoading);
}

async function performBackupWithPicker() {
    showLoading();

    try {
        // 获取备份数据
        const response = await authenticatedFetch('/api/backup');
        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('未授权');
        }
        const data = await response.json();

        if (data.success) {
            // 使用文件选择器让用户选择保存位置
            const filename = `password_backup_${new Date().toISOString().split('T')[0]}.json`;
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [
                    {
                        description: 'JSON 文件',
                        accept: {
                            'application/json': ['.json'],
                        },
                    },
                ],
            });

            // 创建文件并写入数据
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();

            showToast(`成功备份 ${data.data.count} 条记录到: ${fileHandle.name}`);
        } else {
            showToast(data.error || '备份失败', 'error');
        }
    } catch (error) {
        if (error.name !== 'AbortError') { // 用户取消选择不显示错误
            if (error.message !== '未授权') {
                showToast('备份失败: ' + error.message, 'error');
            }
        } else {
            showToast('已取消备份', 'info');
        }
    } finally {
        hideLoading();
    }
}

// 导入功能
function importPasswords(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            pendingImportData = data;

            // 显示导入预览
            const importPreview = document.getElementById('importPreview');
            const entries = data.entries || data.passwords || data.data || [];

            if (entries.length === 0) {
                showToast('文件中没有找到可导入的数据', 'error');
                return;
            }

            importPreview.innerHTML = `
                <div class="alert alert-info">
                    <h6><i class="fas fa-info-circle"></i> 导入预览</h6>
                    <p class="mb-1">找到 ${entries.length} 条密码记录</p>
                    <p class="mb-0 small text-muted">重复的记录（相同网站名和用户名）将被自动跳过</p>
                </div>
                <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                    <table class="table table-sm table-striped">
                        <thead>
                            <tr>
                                <th>网站</th>
                                <th>用户名</th>
                                <th>分类</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${entries.slice(0, 10).map(item => `
                                <tr>
                                    <td>${escapeHtml(item.site_name || 'N/A')}</td>
                                    <td>${escapeHtml(item.username || 'N/A')}</td>
                                    <td>${item.category ? escapeHtml(item.category) : '<span class="text-muted">-</span>'}</td>
                                </tr>
                            `).join('')}
                            ${entries.length > 10 ? `<tr><td colspan="3" class="text-center text-muted">... 还有 ${entries.length - 10} 条</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            `;

            if (!importModal) {
                const importModalEl = document.getElementById('importModal');
                importModal = new bootstrap.Modal(importModalEl);
            }
            importModal.show();
        } catch (error) {
            showToast('文件格式错误，请选择有效的JSON文件', 'error');
            console.error('解析失败:', error);
        }
    };

    reader.readAsText(file);
        event.target.value = '';
}

function confirmImport() {
    if (!pendingImportData) return;

    showLoading();

    const importData = {
        entries: pendingImportData.entries || pendingImportData.passwords || pendingImportData.data || []
    };

    authenticatedFetch('/api/passwords/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
    })
    .then(response => {
        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('未授权');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast(data.message);
            importModal.hide();
            loadPasswords();
            loadCategories();
            pendingImportData = null;
        } else {
            showToast(data.error || '导入失败', 'error');
        }
    })
    .catch(error => {
        if (error.message !== '未授权') {
            showToast('网络错误: ' + error.message, 'error');
        }
    })
    .finally(hideLoading);
}

function setActiveNav() {
    // 设置当前页面导航高亮（如果有多个页面）
    const currentPath = window.location.pathname;
    // 此函数可用于未来的多页面导航高亮
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 重复的事件监听器已经在上面定义了，这里移除重复的 confirmImportBtn 监听器
    // 设置导航栏 active 状态
    setActiveNav();

    // 检查登录状态
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // 初始化 Bootstrap 组件
    const entryModalEl = document.getElementById('entryModal');
    const viewModalEl = document.getElementById('viewModal');
    const deleteModalEl = document.getElementById('deleteModal');
    const importModalEl = document.getElementById('importModal');
    const backupModalEl = document.getElementById('backupModal');
    const toastEl = document.getElementById('toast');

    entryModal = new bootstrap.Modal(entryModalEl);
    viewModal = new bootstrap.Modal(viewModalEl);
    deleteModal = new bootstrap.Modal(deleteModalEl);
    importModal = new bootstrap.Modal(importModalEl);
    backupModal = new bootstrap.Modal(backupModalEl);
    toast = new bootstrap.Toast(toastEl);

    // 显示当前用户名
    const user = getCurrentUser();
    if (user) {
        document.getElementById('currentUsername').textContent = user.username;
    }

    // 初始化数据
    generatePassword();
    loadPasswords();
    loadCategories();

    // 事件监听
    document.getElementById('passwordLength').addEventListener('input', function() {
        document.getElementById('lengthValue').textContent = this.value;
    });

    document.getElementById('searchInput').addEventListener('input', debounce(function() {
        currentPage = 1;
        loadPasswords();
    }, 300));

    document.getElementById('categoryFilter').addEventListener('change', function() {
        currentPage = 1;
        loadPasswords();
    });

    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    document.getElementById('confirmImportBtn').addEventListener('click', confirmImport);
    document.getElementById('password').addEventListener('input', function() {
        updateStrengthIndicator(this.value);
    });
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            currentPage = 1;
            loadPasswords();
        }
    });
});
