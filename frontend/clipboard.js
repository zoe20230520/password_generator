// 智能剪贴板 JavaScript

const API_BASE = '/api/clipboard';
let currentPage = 1;
let currentView = 'grid';
let allItems = [];

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
        const type = document.getElementById('typeFilter').value;
        const tag = document.getElementById('tagFilter').value;

        let url = `${API_BASE}?page=${currentPage}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (type) url += `&is_password=${type}`;
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
    const container = document.getElementById('clipboardContainer');

    if (items.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-clipboard-list fa-4x text-muted mb-3"></i>
                <h4 class="text-muted">暂无剪贴板项目</h4>
                <p class="text-muted">点击"添加剪贴板"按钮开始使用</p>
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

// 渲染网格视图
function renderGridView(items) {
    const container = document.getElementById('clipboardContainer');
    container.className = 'row';

    container.innerHTML = items.map(item => `
        <div class="col-md-6 col-lg-4 mb-3">
            <div class="card clipboard-card ${item.is_password ? 'password' : ''}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title mb-0 text-truncate">${escapeHtml(item.title)}</h5>
                        ${item.is_password ? '<i class="fas fa-key text-danger"></i>' : '<i class="fas fa-font text-success"></i>'}
                    </div>
                    <p class="card-text content-preview text-muted small">${escapeHtml(item.content)}</p>
                    <div class="mb-2">
                        ${item.category ? `<span class="badge bg-primary tag-badge">${escapeHtml(item.category)}</span>` : ''}
                        ${item.tags ? item.tags.split(',').map(tag => `<span class="badge bg-secondary tag-badge">${escapeHtml(tag.trim())}</span>`).join('') : ''}
                    </div>
                    <small class="text-muted">
                        <i class="fas fa-copy me-1"></i>${item.use_count || 0} 次使用
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
    const container = document.getElementById('clipboardContainer');
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
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>
                                <strong>${escapeHtml(item.title)}</strong>
                                ${item.is_password ? '<i class="fas fa-key text-danger ms-2"></i>' : ''}
                            </td>
                            <td>${escapeHtml(item.category || '-')}</td>
                            <td>
                                <span class="badge ${item.is_password ? 'bg-danger' : 'bg-success'}">
                                    ${item.is_password ? '密码' : '文本'}
                                </span>
                            </td>
                            <td>
                                ${item.tags ? item.tags.split(',').slice(0, 2).map(tag =>
                                    `<span class="badge bg-secondary me-1">${escapeHtml(tag.trim())}</span>`
                                ).join('') : '-'}
                            </td>
                            <td>${item.use_count || 0}</td>
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
        document.getElementById('viewType').innerHTML = item.is_password ?
            '<span class="badge bg-danger">密码类型</span>' :
            '<span class="badge bg-success">文本类型</span>';
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

        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>编辑剪贴板';
        document.getElementById('itemId').value = id;
        document.getElementById('title').value = item.title;
        document.getElementById('content').value = item.content;
        document.getElementById('category').value = item.category || '';
        document.getElementById('isPassword').value = item.is_password.toString();
        document.getElementById('tags').value = item.tags || '';

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
    const isPassword = document.getElementById('isPassword').value === 'true';
    const tags = document.getElementById('tags').value.trim();

    if (!title || !content) {
        showToast('标题和内容不能为空', 'warning');
        return;
    }

    try {
        const data = {
            title,
            content,
            category,
            is_password: isPassword,
            tags
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
            showToast('创建成功！', 'success');
        }

        bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
        document.getElementById('clipboardForm').reset();
        document.getElementById('itemId').value = '';
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
        document.getElementById('passwordItems').textContent = stats.password_items;
        document.getElementById('textItems').textContent = stats.text_items;

        // 最常用项目
        const topItem = stats.top_items[0];
        document.getElementById('topItem').textContent = topItem ? escapeHtml(topItem.title) : '--';
    } catch (error) {
        console.error('加载统计失败:', error);
    }
}

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

        showToast(`导出成功！共 ${response.count} 条记录`, 'success');
    } catch (error) {
        showToast('导出失败: ' + error.message, 'danger');
    }
}

// 导入数据
async function importData() {
    const importDataText = document.getElementById('importData').value.trim();

    if (!importDataText) {
        showToast('请输入数据', 'warning');
        return;
    }

    try {
        const data = JSON.parse(importDataText);

        if (!data.items || !Array.isArray(data.items)) {
            throw new Error('数据格式错误');
        }

        const response = await apiRequest(`${API_BASE}/import`, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        showToast(response.message || '导入成功！', 'success');
        bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
        document.getElementById('importData').value = '';
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
        new bootstrap.Modal(document.getElementById('importModal')).show();
    });
    document.getElementById('importSubmitBtn').addEventListener('click', importData);
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
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus me-2"></i>添加剪贴板';
    });
});
