const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value.trim();

  if (!email || !password) {
    loginError.textContent = "Please fill out both fields.";
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      loginError.style.color = 'green';
      loginError.textContent = data.message;

      // Save the JWT token in localStorage or sessionStorage
      localStorage.setItem('token', data.token);

      // Redirect to a protected page or dashboard
      setTimeout(() => {
        window.location.href = 'index.html'; // change this to your actual page
      }, 1000);
    } else {
      loginError.style.color = 'red';
      loginError.textContent = data.error || 'Login failed';
    }
  } catch (error) {
    console.error('Error logging in:', error);
    loginError.textContent = 'Server error. Try again later.';
  }
});
