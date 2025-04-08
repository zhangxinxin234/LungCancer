document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerFormInner');
    const showRegisterLink = document.getElementById('showRegister');

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
        document.getElementById('registerForm').style.display = 'block';
    });
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
            // 使用cookie而不是localStorage存储token
            document.cookie = `token=${data.access_token}; path=/`;
            window.location.href = '/patient_info';
        } else {
            alert('登录失败，请检查用户名和密码');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('登录过程中发生错误');
    });
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
            alert('注册失败，请重试');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('注册过程中发生错误');
    });
}
