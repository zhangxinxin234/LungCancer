document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');

    // 显示当前登录用户
    displayCurrentUser();

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        login(username, password);
    });

    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        register(username, password);
    });

    showRegisterLink.addEventListener('click', function(e) {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        document.getElementById('formTitle').textContent = '注册';
    });

    showLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        document.getElementById('formTitle').textContent = '登录';
    });
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

function login(username, password) {
    fetch('/api/v1/auth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            // 使用cookie存储token和用户名，确保设置正确的过期时间
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 1); // 1天后过期
            document.cookie = `token=${data.access_token}; path=/; expires=${expirationDate.toUTCString()}`;
            document.cookie = `username=${encodeURIComponent(username)}; path=/; expires=${expirationDate.toUTCString()}`;
            window.location.href = '/patient_info';
        } else {
            showError('登录失败，请检查用户名和密码。');
        }
    })
    .catch(error => {
        console.error('登录错误:', error);
        showError('登录过程中发生错误，请稍后重试。');
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
    .then(response => response.json())
    .then(data => {
        if (data.id) {
            // 注册成功后直接登录
            login(username, password);
        } else {
            showError('注册失败，请重试');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('注册过程中发生错误');
    });
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}
