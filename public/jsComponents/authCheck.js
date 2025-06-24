document.addEventListener('DOMContentLoaded', () => {
  fetch('http://localhost:3000/api/check', {
    method: 'GET',
    credentials: 'include'
  })
  .then(response => {
    if (!response.ok) {
      window.location.href = 'login.html';
    } else {
      return response.json();
    }
  })
  .then(data => {
    if (data) {
      console.log('User is authenticated:', data.username);
      document.body.style.display = 'block';
    }
  })
  .catch(() => {
    window.location.href = 'login.html';
  });
});