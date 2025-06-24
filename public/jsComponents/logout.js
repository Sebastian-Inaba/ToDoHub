async function logout() {
  try {
    const res = await fetch('http://localhost:3000/api/logout', {
      method: 'POST',
      credentials: 'include' 
    });

    const data = await res.json();
    console.log(data.message);

    window.location.href = 'login.html';  
  } catch (err) {
    console.error('Logout failed:', err);
  }
}
