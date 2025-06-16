const uploadBtn = document.getElementById('uploadBtn');
const profilePicInput = document.getElementById('profilePic');
const previewImg = document.getElementById('pfpPreviewImg');
const icon = document.getElementById('pfpIcon');
const form = document.getElementById('registerForm');

form.addEventListener('submit', async (event) => {
  event.preventDefault(); 

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    alert('Passwords do not match, please try again.');
    return;
  }

  const formData = new FormData(form);

  try {
    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      alert('Registration successful!');
      window.location.href = 'login.html';
    } else {
      const errorText = await response.text();
      alert('Error: ' + errorText);
    }
  } catch (err) {
    console.error(err);
    alert('Something went wrong!');
  }
});

uploadBtn.addEventListener('click', () => {
  profilePicInput.click();
});

profilePicInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewImg.style.display = 'block'; 
      icon.style.display = 'none';        
    };
    reader.readAsDataURL(file);
  } else {
    previewImg.src = '';
    previewImg.style.display = 'none'; 
    icon.style.display = 'block';      
  }
});