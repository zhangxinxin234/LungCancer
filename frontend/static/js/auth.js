// 全局的fetch函数封装，统一处理401错误
async function fetchWithAuth(url, options = {}) {
    try {
        const response = await fetch(url, options);
        // 登录接口的401错误需要特殊处理，不直接跳转
        if (response.status === 401 && url !== '/api/v1/auth/token') {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }
        return response;
    } catch (error) {
        if (error.message === 'Unauthorized') {
            throw error;
        }
        console.error('Fetch error:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 显示当前登录用户
    displayCurrentUser();

    // 检查是否在登录页面
    if (window.location.pathname === '/login') {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const showRegisterLink = document.getElementById('showRegister');
        const showLoginLink = document.getElementById('showLogin');

        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                login(username, password);
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const username = document.getElementById('regUsername').value;
                const password = document.getElementById('regPassword').value;
                register(username, password);
            });
        }

        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', function(e) {
                e.preventDefault();
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
                document.getElementById('formTitle').textContent = '注册';
            });
        }

        if (showLoginLink) {
            showLoginLink.addEventListener('click', function(e) {
                e.preventDefault();
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
                document.getElementById('formTitle').textContent = '登录';
            });
        }
    }
});

// 获取cookie函数
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// 显示用户名函数
function displayCurrentUser() {
    const username = getCookie('username');
    if (username) {
        const navbarNav = document.querySelector('.navbar-nav.ms-auto');
        if (navbarNav) {
            // 检查是否已经存在用户信息元素
            const existingUserInfo = navbarNav.querySelector('.user-info');
            if (existingUserInfo) {
                // 如果已存在，则更新内容
                existingUserInfo.innerHTML = `
                    <span class="nav-link" style="cursor: default;">
                        <i class='bx bx-user-circle medical-icon'></i>
                        ${decodeURIComponent(username)}
                    </span>
                `;
            } else {
                // 如果不存在，则创建新元素
                const userInfoLi = document.createElement('li');
                userInfoLi.className = 'nav-item user-info';
                userInfoLi.innerHTML = `
                    <span class="nav-link" style="cursor: default;">
                        <i class='bx bx-user-circle medical-icon'></i>
                        ${decodeURIComponent(username)}
                    </span>
                `;
                // 插入到退出登录按钮之前
                const logoutButton = navbarNav.querySelector('li:last-child');
                navbarNav.insertBefore(userInfoLi, logoutButton);
            }
        }
    }
}

// 在页面加载时显示用户名
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname !== '/login') {
        displayCurrentUser();
    }
});

function clearErrors() {
    console.log('清除所有错误提示');
    // 清除全局错误消息
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.innerHTML = '';
    }

    // 清除所有字段错误
    document.querySelectorAll('.is-invalid').forEach(field => {
        field.classList.remove('is-invalid');
    });

    // 移除所有错误提示
    document.querySelectorAll('.invalid-feedback').forEach(feedback => {
        feedback.remove();
    });
}

function setFieldError(fieldId, message = '') {
    console.log(`设置字段错误: ${fieldId}, 消息: ${message}`);
    const field = document.getElementById(fieldId);
    if (field) {
        // 设置字段为错误状态
        field.classList.add('is-invalid');

        // 如果提供了错误消息，显示在字段下方
        if (message) {
            // 移除已存在的错误提示
            const existingFeedback = field.parentElement.querySelector('.invalid-feedback');
            if (existingFeedback) {
                existingFeedback.remove();
            }

            // 创建新的错误提示
            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'invalid-feedback';
            feedbackDiv.textContent = message;
            feedbackDiv.style.display = 'block';

            // 确保错误消息样式正确
            feedbackDiv.style.color = '#dc3545';
            feedbackDiv.style.marginTop = '0.25rem';
            feedbackDiv.style.fontSize = '0.875em';
            feedbackDiv.style.fontWeight = '400';

            // 将错误提示插入到输入框的父元素中
            field.parentElement.appendChild(feedbackDiv);

            console.log(`错误提示已添加到 ${fieldId} 下方`);
        }
    } else {
        console.error(`未找到字段: ${fieldId}`);
    }
}

// 添加全局请求拦截器处理 401 错误
function handleUnauthorized() {
    // 清除认证信息
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // 如果不在登录页面，则重定向到登录页面
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
}

function login(username, password) {
    clearErrors();

    // 验证输入
    if (!username.trim()) {
        setFieldError('username', '请输入用户名');
        return;
    }

    if (!password.trim()) {
        setFieldError('password', '请输入密码');
        return;
    }

    // 显示加载状态
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
    if (loginButton) {
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="bx bx-loader bx-spin"></i> 登录中...';
    }

    console.log('开始登录请求...');
    // 直接使用fetch而不是fetchWithAuth，因为登录接口的401需要特殊处理
    fetch('/api/v1/auth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    })
    .then(async response => {
        console.log('登录请求响应状态:', response.status);
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json().catch(e => ({}));
        } else {
            data = {};
        }

        if (!response.ok) {
            if (response.status === 401) {
                console.log('登录失败');
                // 统一显示"用户名或密码错误"的提示
                const errorElement = document.getElementById('errorMessage');
                if (errorElement) {
                    errorElement.className = 'alert alert-danger';
                    errorElement.innerHTML = `
                        <i class='bx bx-error-circle' style='margin-right: 8px;'></i>
                        <span>用户名或密码错误</span>
                    `;
                    errorElement.style.display = 'flex';
                    errorElement.style.alignItems = 'center';
                }

                // 将输入框标记为错误状态
                setFieldError('username');
                setFieldError('password');

                throw new Error('认证失败');
            } else {
                setFieldError('password', '登录失败，请重试');
                throw new Error(data.detail || '登录失败');
            }
        }
        return data;
    })
    .then(data => {
        if (data.access_token) {
            // 使用cookie存储token和用户名，确保设置正确的过期时间
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 1); // 1天后过期
            document.cookie = `token=${data.access_token}; path=/; expires=${expirationDate.toUTCString()}`;
            document.cookie = `username=${encodeURIComponent(username)}; path=/; expires=${expirationDate.toUTCString()}`;
            window.location.href = '/patient_info';
        }
    })
    .catch(error => {
        console.error('登录错误:', error);
        if (!error.message.includes('认证失败')) {
            // 显示通用错误消息
            const errorElement = document.getElementById('errorMessage');
            if (errorElement) {
                errorElement.className = 'alert alert-danger';
                errorElement.innerHTML = `
                    <i class='bx bx-error-circle' style='margin-right: 8px;'></i>
                    <span>登录失败，请稍后重试</span>
                `;
                errorElement.style.display = 'flex';
                errorElement.style.alignItems = 'center';
            }

            // 将输入框标记为错误状态
            setFieldError('username');
            setFieldError('password');
        }
    })
    .finally(() => {
        // 恢复按钮状态
        const loginButton = document.querySelector('#loginForm button[type="submit"]');
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.innerHTML = '登录';
        }
    });
}

// 退出登录函数
function logout() {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    // 移除用户信息显示
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        userInfo.remove();
    }
    window.location.href = '/login';
}

function register(username, password) {
    console.log('开始注册流程...');
    clearErrors();

    // 清除全局错误消息
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }

    // 验证输入
    if (!username.trim()) {
        setFieldError('regUsername', '请输入用户名');
        return;
    }

    if (!password.trim()) {
        setFieldError('regPassword', '请输入密码');
        return;
    }

    // 验证密码长度
    if (password.length < 6) {
        setFieldError('regPassword', '密码长度至少为6个字符');
        return;
    }

    // 显示加载状态
    const registerButton = document.querySelector('#registerForm button[type="submit"]');
    if (registerButton) {
        registerButton.disabled = true;
        registerButton.innerHTML = '<i class="bx bx-loader bx-spin"></i> 注册中...';
    }

    // 确保错误消息已清除
    const errorMsgElement = document.getElementById('errorMessage');
    if (errorMsgElement) {
        errorMsgElement.style.display = 'none';
    }

    fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password
        }),
    })
    .then(async response => {
        console.log('注册请求响应状态:', response.status);
        let data;
        try {
            data = await response.json();
            console.log('注册响应数据:', data);
        } catch (e) {
            console.error('解析响应JSON失败:', e);
            data = { detail: '服务器响应格式错误' };
        }

        if (!response.ok) {
            console.log('注册请求失败, 状态码:', response.status);
            // 准备显示错误提示
            const errorElement = document.getElementById('errorMessage');
            if (errorElement) {
                // 确保使用错误样式
                errorElement.className = 'alert alert-danger';
            }

            if (response.status === 400 && data.detail === "Username already registered") {
                console.log('用户名已被注册错误');
                // 显示全局错误消息
                const errorElement = document.getElementById('errorMessage');
                if (errorElement) {
                    errorElement.innerHTML = `
                        <i class='bx bx-error-circle' style='margin-right: 8px;'></i>
                        <span>注册失败：用户名已被注册</span>
                    `;
                    errorElement.style.display = 'flex';
                    errorElement.style.alignItems = 'center';
                }
                // 在用户名输入框显示错误状态
                const usernameField = document.getElementById('regUsername');
                if (usernameField) {
                    usernameField.classList.add('is-invalid');
                }
            } else if (response.status === 422) {
                // 处理验证错误
                if (data.detail && Array.isArray(data.detail)) {
                    const errorMessages = [];
                    data.detail.forEach(err => {
                        if (err.loc && err.loc[1] === 'username') {
                            const field = document.getElementById('regUsername');
                            if (field) {
                                field.classList.add('is-invalid');
                                // 移除已存在的错误提示
                                const existingFeedback = field.parentElement.querySelector('.invalid-feedback');
                                if (existingFeedback) {
                                    existingFeedback.remove();
                                }
                            }
                            errorMessages.push(`用户名: ${err.msg}`);
                        } else if (err.loc && err.loc[1] === 'password') {
                            const field = document.getElementById('regPassword');
                            if (field) {
                                field.classList.add('is-invalid');
                                // 移除已存在的错误提示
                                const existingFeedback = field.parentElement.querySelector('.invalid-feedback');
                                if (existingFeedback) {
                                    existingFeedback.remove();
                                }
                            }
                            errorMessages.push(`密码: ${err.msg}`);
                        }
                    });
                    // 显示全局错误消息
                    const errorElement = document.getElementById('errorMessage');
                    if (errorElement && errorMessages.length > 0) {
                        errorElement.innerHTML = `
                            <i class='bx bx-error-circle' style='margin-right: 8px;'></i>
                            <span>注册失败：<br>${errorMessages.join('<br>')}</span>
                        `;
                        errorElement.style.display = 'flex';
                        errorElement.style.alignItems = 'flex-start';
                    }
                }
            } else {
                // 显示一般错误消息
                const errorElement = document.getElementById('errorMessage');
                if (errorElement) {
                    errorElement.innerHTML = `
                        <i class='bx bx-error-circle' style='margin-right: 8px;'></i>
                        <span>注册失败：请稍后重试</span>
                    `;
                    errorElement.style.display = 'flex';
                    errorElement.style.alignItems = 'center';
                }
                // 标记输入框为错误状态，但不添加具体的错误消息
                const fields = ['regUsername', 'regPassword'];
                fields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.classList.add('is-invalid');
                        // 移除已存在的错误提示
                        const existingFeedback = field.parentElement.querySelector('.invalid-feedback');
                        if (existingFeedback) {
                            existingFeedback.remove();
                        }
                    }
                });
            }
            throw new Error(data.detail || '注册失败');
        }
        return data;
    })
    .then(data => {
        if (data.id) {
            // 注册成功后直接登录
            login(username, password);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        if (!error.message.includes('注册失败')) {
            // 只将输入框标记为错误状态，不显示具体错误消息
            setFieldError('regUsername');
            setFieldError('regPassword');
        }
    })
    .finally(() => {
        // 恢复按钮状态
        const registerButton = document.querySelector('#registerForm button[type="submit"]');
        if (registerButton) {
            registerButton.disabled = false;
            registerButton.innerHTML = '注册';
        }
    });
}

// 显示错误提示气泡
function showError(message, fieldId = null) {
    console.log('显示错误:', message, fieldId);

    // 全局错误消息
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        // 添加警告图标
        errorDiv.innerHTML = `
            <i class='bx bx-error-circle' style='margin-right: 8px;'></i>
            <span>${message}</span>
        `;
        errorDiv.style.display = 'flex';
        errorDiv.style.alignItems = 'center';
        errorDiv.style.backgroundColor = '#fff3f3';
        errorDiv.style.color = '#dc3545';
        errorDiv.style.padding = '10px 15px';
        errorDiv.style.borderRadius = '4px';
        errorDiv.style.border = '1px solid #dc3545';
        errorDiv.style.boxShadow = '0 2px 10px rgba(220, 53, 69, 0.1)';
        errorDiv.style.marginBottom = '15px';

        // 确保错误消息可见
        errorDiv.style.opacity = '1';
        errorDiv.style.visibility = 'visible';
        errorDiv.style.zIndex = '1000';

        // 添加动画效果
        errorDiv.style.animation = 'none';
        errorDiv.offsetHeight; // 触发重排
        errorDiv.style.animation = 'shake 0.5s ease-in-out';

        // 5秒后自动隐藏
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    // 如果指定了字段ID，显示字段特定的提示气泡
    if (fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            // 设置字段为错误状态
            field.classList.add('is-invalid');

            // 查找或创建错误反馈元素
            let feedbackDiv = field.nextElementSibling;
            if (!feedbackDiv || !feedbackDiv.classList.contains('invalid-feedback')) {
                feedbackDiv = document.createElement('div');
                feedbackDiv.className = 'invalid-feedback';
                field.parentNode.insertBefore(feedbackDiv, field.nextSibling);
            }

            // 设置错误消息
            feedbackDiv.textContent = message;
            feedbackDiv.style.display = 'block';
        }
    }

    console.error('Error:', message);
}
