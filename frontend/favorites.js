// 收藏网站 JavaScript

const API_BASE = '/api/favorites';
let currentPage = 1;
let currentView = 'grid';
let currentCategory = 'all';
let allItems = [];
let pendingImportData = null;
let useCustomBackupPath = false;
let backupModal = null;

// 获取token
function getToken() {
    return localStorage.getItem('token');
}

// 设置token
function setToken(token) {
    localStorage.setItem('token', token);
}

// API请求封装
async function apiRequest(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(url, { ...options, headers });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '请求失败');
        }

        return data;
    } catch (error) {
        console.error('API请求错误:', error);
        throw error;
    }
}

// 检查登录状态
function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// 获取当前用户信息
async function getCurrentUser() {
    try {
        const response = await apiRequest('/api/auth/me');
        const user = response.data;
        document.getElementById('currentUser').innerHTML = `
            <i class="fas fa-user me-1"></i>${user.username}
        `;
    } catch (error) {
        console.error('获取用户信息失败:', error);
    }
}

// 加载剪贴板项目
async function loadItems() {
    try {
        const search = document.getElementById('searchInput').value;
        const category = document.getElementById('categoryFilter').value;
        const tag = document.getElementById('tagFilter').value;

        let url = `${API_BASE}?page=${currentPage}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (currentCategory !== 'all') url += `&item_type=${currentCategory}`;
        if (tag) url += `&tag=${encodeURIComponent(tag)}`;

        const response = await apiRequest(url);
        allItems = response.data;

        renderItems(allItems);
        renderPagination(response.total, response.pages, response.current_page);
    } catch (error) {
        console.error('加载项目失败:', error);
        showToast('加载项目失败', 'danger');
    }
}

// 渲染项目列表
function renderItems(items) {
    const container = document.getElementById('favoritesContainer');

    if (items.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-star fa-4x text-muted mb-3"></i>
                <h4 class="text-muted">暂无收藏项目</h4>
                <p class="text-muted">点击"添加收藏"按钮开始使用</p>
            </div>
        `;
        return;
    }

    if (currentView === 'grid') {
        renderGridView(items);
    } else {
        renderListView(items);
    }
}

// 获取收藏类型图标
function getItemTypeIcon(itemType) {
    switch (itemType) {
        case 'link':
            return '<i class="fas fa-link text-info"></i>';
        case 'image':
            return '<i class="fas fa-image text-success"></i>';
        case 'article':
            return '<i class="fas fa-file-alt text-warning"></i>';
        default:
            return '<i class="fas fa-star text-primary"></i>';
    }
}

// 获取收藏类型名称
function getItemTypeName(itemType) {
    switch (itemType) {
        case 'link':
            return '链接';
        case 'image':
            return '图片';
        case 'article':
            return '文章';
        default:
            return '未知';
    }
}

// 获取收藏类型徽章颜色
function getItemTypeBadgeColor(itemType) {
    switch (itemType) {
        case 'link':
            return 'bg-info';
        case 'image':
            return 'bg-success';
        case 'article':
            return 'bg-warning';
        default:
            return 'bg-secondary';
    }
}

// 格式化相对时间
function formatRelativeTime(dateString) {
    if (!dateString) return '未知时间';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);
    
    if (diffSec < 60) return '刚刚';
    if (diffMin < 60) return `大约${diffMin}分钟前`;
    if (diffHour < 24) return `大约${diffHour}小时前`;
    if (diffDay < 7) return `大约${diffDay}天前`;
    if (diffWeek < 4) return `大约${diffWeek}周前`;
    if (diffMonth < 12) return `大约${diffMonth}个月前`;
    return `大约${diffYear}年前`;
}
// 渲染网格视图
function renderGridView(items) {
    const container = document.getElementById('favoritesContainer');
    container.className = 'row';

    container.innerHTML = items.map(item => `
        <div class="col-md-6 col-lg-4 mb-3">
            <div class="card favorites-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title mb-0 text-truncate">${escapeHtml(item.title)}</h5>
                        ${getItemTypeIcon(item.item_type || 'link')}
                    </div>
                    <p class="card-text content-preview text-muted small">${escapeHtml(item.content)}</p>
                    <div class="mb-2">
                        ${item.category ? `<span class="badge bg-primary tag-badge">${escapeHtml(item.category)}</span>` : ''}
                        ${item.tags ? item.tags.split(',').map(tag => `<span class="badge bg-secondary tag-badge">${escapeHtml(tag.trim())}</span>`).join('') : ''}
                    </div>
                    <small class="text-muted">
                        <i class="fas fa-copy me-1"></i>${item.use_count || 0} 次使用
                        <span class="ms-2"><i class="fas fa-clock me-1"></i>${formatRelativeTime(item.created_at)}</span>
                    </small>
                </div>
                <div class="card-footer bg-transparent">
                    <div class="btn-group w-100" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewItem(${item.id})" title="查看">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="copyItem(${item.id})" title="复制">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="editItem(${item.id})" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${item.id})" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// 渲染列表视图
function renderListView(items) {
    const container = document.getElementById('favoritesContainer');
    container.className = '';

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-light">
                    <tr>
                        <th>标题</th>
                        <th>分类</th>
                        <th>类型</th>
                        <th>标签</th>
                        <th>使用次数</th>
                        <th>添加时间</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>
                                <strong>${escapeHtml(item.title)}</strong>
                                ${getItemTypeIcon(item.item_type || 'link')}
                            </td>
                            <td>${escapeHtml(item.category || '-')}</td>
                            <td>
                                <span class="badge ${getItemTypeBadgeColor(item.item_type || 'link')}">
                                    ${getItemTypeName(item.item_type || 'link')}
                                </span>
                            </td>
                            <td>
                                ${item.tags ? item.tags.split(',').slice(0, 2).map(tag =>
                                    `<span class="badge bg-secondary me-1">${escapeHtml(tag.trim())}</span>`
                                ).join('') : '-'}
                            </td>
                            <td>${item.use_count || 0}</td>
                            <td>${formatRelativeTime(item.created_at)}</td>
                            <td>
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-outline-primary" onclick="viewItem(${item.id})" title="查看">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-success" onclick="copyItem(${item.id})" title="复制">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-warning" onclick="editItem(${item.id})" title="编辑">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${item.id})" title="删除">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 渲染分页
function renderPagination(total, pages, current) {
    const pagination = document.getElementById('pagination');

    if (pages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';

    // 上一页
    html += `
        <li class="page-item ${current === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${current - 1})">上一页</a>
        </li>
    `;

    // 页码
    for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || (i >= current - 2 && i <= current + 2)) {
            html += `
                <li class="page-item ${i === current ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="goToPage(${i})">${i}</a>
                </li>
            `;
        } else if (i === current - 3 || i === current + 3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // 下一页
    html += `
        <li class="page-item ${current === pages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${current + 1})">下一页</a>
        </li>
    `;

    pagination.innerHTML = html;
}

// 跳转页面
function goToPage(page) {
    if (page < 1) return;
    currentPage = page;
    loadItems();
}

// 查看项目
async function viewItem(id) {
    try {
        const response = await apiRequest(`${API_BASE}/${id}`);
        const item = response.data;

        document.getElementById('viewModalTitle').innerHTML = `<i class="fas fa-eye me-2"></i>查看详情 - ${escapeHtml(item.title)}`;
        document.getElementById('viewContent').textContent = item.content;
        document.getElementById('viewCategory').textContent = item.category || '-';
        document.getElementById('viewType').innerHTML = `<span class="badge ${getItemTypeBadgeColor(item.item_type || 'link')}">${getItemTypeName(item.item_type || 'link')}</span>`;
        document.getElementById('viewTags').innerHTML = item.tags ?
            item.tags.split(',').map(tag => `<span class="badge bg-secondary me-1">${escapeHtml(tag.trim())}</span>`).join('') :
            '<span class="text-muted">无标签</span>';
        document.getElementById('viewUseCount').textContent = item.use_count || 0;
        document.getElementById('viewCreatedAt').textContent = formatDate(item.created_at);
        document.getElementById('viewLastUsed').textContent = formatDate(item.last_used);

        // 存储内容以便复制
        document.getElementById('copyFromViewBtn').dataset.content = item.content;

        new bootstrap.Modal(document.getElementById('viewModal')).show();
    } catch (error) {
        showToast('查看失败: ' + error.message, 'danger');
    }
}

// 复制项目
async function copyItem(id) {
    try {
        const response = await apiRequest(`${API_BASE}/${id}/copy`, { method: 'POST' });
        const content = response.data.content;

        await navigator.clipboard.writeText(content);
        showToast('复制成功！', 'success');

        // 刷新列表以更新使用计数
        loadItems();
    } catch (error) {
        showToast('复制失败: ' + error.message, 'danger');
    }
}

// 编辑项目
async function editItem(id) {
    try {
        // 先获取完整内容
        const response = await apiRequest(`${API_BASE}/${id}`);
        const item = response.data;

        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>编辑收藏';
        document.getElementById('itemId').value = id;
        document.getElementById('title').value = item.title;
        document.getElementById('content').value = item.content;
        document.getElementById('category').value = item.category || '';
        document.getElementById('itemType').value = item.item_type || 'link';
        document.getElementById('tags').value = item.tags || '';
        document.getElementById('url').value = item.url || '';
        document.getElementById('imageUrl').value = item.image_url || '';
        
        handleItemTypeChange();
        
        if (item.image_url) {
            const imagePreview = document.getElementById('imagePreview');
            imagePreview.src = item.image_url;
            imagePreview.style.display = 'block';
        }

        new bootstrap.Modal(document.getElementById('addModal')).show();
    } catch (error) {
        showToast('加载编辑数据失败: ' + error.message, 'danger');
    }
}

// 删除项目
async function deleteItem(id) {
    if (!confirm('确定要删除这个项目吗？')) return;

    try {
        await apiRequest(`${API_BASE}/${id}`, { method: 'DELETE' });
        showToast('删除成功！', 'success');
        loadItems();
        loadStats();
    } catch (error) {
        showToast('删除失败: ' + error.message, 'danger');
    }
}

// 保存项目
async function saveItem() {
    const id = document.getElementById('itemId').value;
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const category = document.getElementById('category').value.trim();
    const itemType = document.getElementById('itemType').value;
    const tags = document.getElementById('tags').value.trim();
    const url = document.getElementById('url').value.trim();
    const imageUrl = document.getElementById('imageUrl').value.trim();

    if (!title || !content) {
        showToast('标题和描述不能为空', 'warning');
        return;
    }

    try {
        const data = {
            title,
            content,
            category,
            is_password: false,
            item_type: itemType,
            tags,
            url,
            image_url: imageUrl
        };

        if (id) {
            await apiRequest(`${API_BASE}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('更新成功！', 'success');
        } else {
            await apiRequest(API_BASE, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('添加成功！', 'success');
        }

        bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
        document.getElementById('clipboardForm').reset();
        document.getElementById('itemId').value = '';
        document.getElementById('imagePreview').style.display = 'none';
        handleItemTypeChange();
        loadItems();
        loadStats();
    } catch (error) {
        showToast('保存失败: ' + error.message, 'danger');
    }
}

// 批量添加
async function batchAdd() {
    const batchDataText = document.getElementById('batchData').value.trim();

    if (!batchDataText) {
        showToast('请输入数据', 'warning');
        return;
    }

    try {
        const items = JSON.parse(batchDataText);

        if (!Array.isArray(items)) {
            throw new Error('数据必须是数组格式');
        }

        const response = await apiRequest(`${API_BASE}/batch`, {
            method: 'POST',
            body: JSON.stringify({ items })
        });

        showToast(response.message || '批量添加成功！', 'success');
        bootstrap.Modal.getInstance(document.getElementById('batchModal')).hide();
        document.getElementById('batchData').value = '';
        loadItems();
        loadStats();
    } catch (error) {
        showToast('批量添加失败: ' + error.message, 'danger');
    }
}

// 加载统计信息
async function loadStats() {
    try {
        const response = await apiRequest(`${API_BASE}/stats`);
        const stats = response.data;

        document.getElementById('totalItems').textContent = stats.total_items;
        document.getElementById('linkItems').textContent = stats.link_items;
        document.getElementById('imageItems').textContent = stats.image_items;
        document.getElementById('articleItems').textContent = stats.article_items;

        // 最常用项目
        const topItem = stats.top_items[0];
        document.getElementById('topItem').textContent = topItem ? escapeHtml(topItem.title) : '--';
    } catch (error) {
        console.error('加载统计失败:', error);
    }
}

// 按分类过滤收藏
function filterByCategory(category) {
    currentCategory = category;
    currentPage = 1;
    
    // 更新导航按钮状态
    document.querySelectorAll('#categoryNav button').forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 加载项目
    loadItems();
}

// 显示设置页面
function showSettings() {
    alert('设置功能即将推出');
}

// 处理收藏类型变化
function handleItemTypeChange() {
    const itemType = document.getElementById('itemType').value;
    const urlField = document.getElementById('urlField');
    const imageField = document.getElementById('imageField');
    
    if (itemType === 'link') {
        urlField.style.display = 'block';
        imageField.style.display = 'none';
    } else if (itemType === 'image') {
        urlField.style.display = 'none';
        imageField.style.display = 'block';
    } else if (itemType === 'article') {
        urlField.style.display = 'block';
        imageField.style.display = 'none';
    }
}

// URL自动识别功能
async function fetchUrlInfo() {
    const url = document.getElementById('url').value.trim();
    
    if (!url) {
        showToast('请输入网址', 'warning');
        return;
    }
    
    try {
        showToast('正在识别...', 'info');
        
        const response = await fetch(`/api/favorites/fetch-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ url })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (result.data.title) {
                document.getElementById('title').value = result.data.title;
            }
            if (result.data.description) {
                document.getElementById('content').value = result.data.description;
            }
            if (result.data.image) {
                document.getElementById('imageUrl').value = result.data.image;
                document.getElementById('imagePreview').src = result.data.image;
                document.getElementById('imagePreview').style.display = 'block';
            }
            showToast('识别成功！', 'success');
        } else {
            showToast('识别失败: ' + result.error, 'danger');
        }
    } catch (error) {
        showToast('识别失败: ' + error.message, 'danger');
    }
}

// 图片URL预览
document.addEventListener('DOMContentLoaded', function() {
    const imageUrlInput = document.getElementById('imageUrl');
    const imagePreview = document.getElementById('imagePreview');
    
    if (imageUrlInput) {
        imageUrlInput.addEventListener('input', function() {
            const url = this.value.trim();
            if (url) {
                imagePreview.src = url;
                imagePreview.style.display = 'block';
                imagePreview.onerror = function() {
                    this.style.display = 'none';
                };
            } else {
                imagePreview.style.display = 'none';
            }
        });
    }
});

// 加载分类和标签
async function loadFilters() {
    try {
        const categoriesRes = await apiRequest(`${API_BASE}/categories`);
        const tagsRes = await apiRequest(`${API_BASE}/tags`);

        const categorySelect = document.getElementById('categoryFilter');
        const tagSelect = document.getElementById('tagFilter');

        // 保存当前选择
        const currentCategory = categorySelect.value;
        const currentTag = tagSelect.value;

        // 更新分类
        categorySelect.innerHTML = '<option value="">全部分类</option>' +
            categoriesRes.data.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');

        // 更新标签
        tagSelect.innerHTML = '<option value="">全部标签</option>' +
            tagsRes.data.map(tag => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('');

        // 恢复选择
        categorySelect.value = currentCategory;
        tagSelect.value = currentTag;
    } catch (error) {
        console.error('加载筛选器失败:', error);
    }
}

// 导出数据
async function exportData() {
    try {
        const response = await apiRequest(`${API_BASE}/export`);
        const data = JSON.stringify(response.data, null, 2);

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clipboard_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`成功导出 ${response.count} 条记录`, 'success');
    } catch (error) {
        showToast('导出失败: ' + error.message, 'danger');
    }
}

// 备份功能
async function showBackupModal() {
    // 读取用户偏好设置
    const rememberLocation = localStorage.getItem('clipboardRememberBackupLocation') === 'true';
    const customPath = localStorage.getItem('clipboardUseCustomBackupPath') === 'true';

    document.getElementById('rememberBackupLocation').checked = rememberLocation;

    if (rememberLocation) {
        // 如果用户选择了记住偏好，直接使用之前的设置
        if (customPath) {
            await backupToCustom();
        } else {
            await backupToDefault();
        }
    } else {
        // 显示模态框让用户选择
        if (!backupModal) {
            backupModal = new bootstrap.Modal(document.getElementById('backupModal'));
        }
        backupModal.show();
    }
}

async function backupToDefault() {
    if (backupModal) {
        backupModal.hide();
    }

    // 保存用户偏好
    saveBackupPreference(false);

    try {
        const response = await apiRequest('/api/backup');
        const data = JSON.stringify(response.data, null, 2);

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clipboard_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`成功备份 ${response.data.count} 条记录`, 'success');
    } catch (error) {
        showToast('备份失败: ' + error.message, 'danger');
    }
}

async function backupToCustom() {
    if (backupModal) {
        backupModal.hide();
    }

    // 保存用户偏好
    saveBackupPreference(true);

    // 检查浏览器是否支持 File System Access API
    if ('showSaveFilePicker' in window) {
        try {
            const response = await apiRequest('/api/backup');

            const filename = `clipboard_backup_${new Date().toISOString().split('T')[0]}.json`;
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

            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(response.data, null, 2));
            await writable.close();

            showToast(`成功备份 ${response.data.count} 条记录`, 'success');
        } catch (error) {
            if (error.name !== 'AbortError') {
                showToast('备份失败: ' + error.message, 'danger');
            } else {
                showToast('已取消备份', 'info');
            }
        }
    } else {
        // 不支持则使用默认方式
        await backupToDefault();
        showToast('您的浏览器不支持自定义路径，已保存到默认下载位置', 'info');
    }
}

function saveBackupPreference(useCustom) {
    const remember = document.getElementById('rememberBackupLocation').checked;
    localStorage.setItem('clipboardRememberBackupLocation', remember.toString());
    if (remember) {
        localStorage.setItem('clipboardUseCustomBackupPath', useCustom.toString());
    }
}

// 导入数据 - 处理文件选择
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            previewImportData(data);
        } catch (error) {
            showToast('文件格式错误，请选择有效的JSON文件', 'danger');
        }
    };
    reader.readAsText(file);
}

// 预览导入数据
function previewImportData(data) {
    pendingImportData = data;
    const items = data.items || data.data || [];

    if (items.length === 0) {
        showToast('文件中没有找到可导入的数据', 'warning');
        return;
    }

    document.getElementById('previewCount').textContent = items.length;
    document.getElementById('importPreview').style.display = 'block';
}

// 导入数据
async function importData() {
    const importDataText = document.getElementById('importData').value.trim();

    // 优先使用文件数据，否则使用文本框数据
    let importData;
    if (pendingImportData) {
        importData = pendingImportData;
    } else if (importDataText) {
        try {
            importData = JSON.parse(importDataText);
        } catch (error) {
            showToast('数据格式错误', 'danger');
            return;
        }
    } else {
        showToast('请选择文件或输入数据', 'warning');
        return;
    }

    try {
        const items = importData.items || importData.data;
        if (!items || !Array.isArray(items)) {
            throw new Error('数据格式错误');
        }

        const response = await apiRequest(`${API_BASE}/import`, {
            method: 'POST',
            body: JSON.stringify({ items })
        });

        showToast(response.message || '导入成功！', 'success');
        bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();

        // 清空输入
        document.getElementById('importData').value = '';
        document.getElementById('importFileInput').value = '';
        document.getElementById('importPreview').style.display = 'none';
        pendingImportData = null;

        loadItems();
        loadStats();
        loadFilters();
    } catch (error) {
        showToast('导入失败: ' + error.message, 'danger');
    }
}

// 视图切换
function setView(view) {
    currentView = view;
    loadItems();
}

// 重置筛选
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('tagFilter').value = '';
    currentPage = 1;
    loadItems();
}

// 显示提示消息
function showToast(message, type = 'info') {
    // 创建toast元素
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toastId = 'toast-' + Date.now();

    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${escapeHtml(message)}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// 创建toast容器
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 设置导航栏 active 状态
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === 'clipboard.html') {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 检查登录状态
    if (!checkAuth()) return;

    // 获取当前用户
    getCurrentUser();

    // 加载数据
    loadItems();
    loadStats();
    loadFilters();

    // 事件监听
    document.getElementById('saveBtn').addEventListener('click', saveItem);
    document.getElementById('batchSaveBtn').addEventListener('click', batchAdd);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', () => {
        // 重置导入表单
        document.getElementById('importData').value = '';
        document.getElementById('importFileInput').value = '';
        document.getElementById('importPreview').style.display = 'none';
        pendingImportData = null;
        new bootstrap.Modal(document.getElementById('importModal')).show();
    });
    document.getElementById('importFileInput').addEventListener('change', handleImportFile);
    document.getElementById('importSubmitBtn').addEventListener('click', importData);
    document.getElementById('backupBtn').addEventListener('click', showBackupModal);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // 筛选器事件
    document.getElementById('searchInput').addEventListener('input', () => { currentPage = 1; loadItems(); });
    document.getElementById('categoryFilter').addEventListener('change', () => { currentPage = 1; loadItems(); });
    document.getElementById('typeFilter').addEventListener('change', () => { currentPage = 1; loadItems(); });
    document.getElementById('tagFilter').addEventListener('change', () => { currentPage = 1; loadItems(); });
    document.getElementById('resetFilters').addEventListener('click', resetFilters);

    // 视图切换事件
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            setView(btn.dataset.view);
        });
    });

    // 从详情模态框复制
    document.getElementById('copyFromViewBtn').addEventListener('click', function() {
        const content = this.dataset.content;
        if (content) {
            navigator.clipboard.writeText(content);
            showToast('复制成功！', 'success');
        }
    });

    // 模态框关闭时重置表单
    document.getElementById('addModal').addEventListener('hidden.bs.modal', function() {
        document.getElementById('clipboardForm').reset();
        document.getElementById('itemId').value = '';
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus me-2"></i>添加收藏';
    });
});
