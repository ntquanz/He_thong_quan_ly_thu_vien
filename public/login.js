const API_URL = 'http://localhost:5000/api';
const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Kiểm tra nếu đã đăng nhập thì redirect đến dashboard
window.addEventListener('load', () => {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = '/';
  }
});

// Xử lý submit form
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // Xóa lỗi cũ
  errorMsg.textContent = '';
  errorMsg.classList.remove('show');

  // Disable button
  const submitBtn = loginForm.querySelector('button');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang đăng nhập...';

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Đăng nhập thất bại');
    }

    // Lưu token vào localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Redirect đến dashboard
    window.location.href = '/';
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    errorMsg.textContent = error.message || 'Lỗi kết nối, vui lòng thử lại';
    errorMsg.classList.add('show');
  } finally {
    // Enable button
    submitBtn.disabled = false;
    submitBtn.textContent = 'Đăng nhập';
  }
});
