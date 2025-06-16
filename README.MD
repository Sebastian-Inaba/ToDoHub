# ToDoHub  
**By Sebastian Inaba**

ToDoHub is a full-stack task management web application built with HTML, CSS, JavaScript, Node.js, Express, and MongoDB. The project demonstrates secure user authentication, CRUD functionality, responsive design, and a clean UI built from scratch.

---

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB + Mongoose
- **Security:** Bcrypt (password hashing), JSON Web Tokens (JWT)
- **Design Tools:** Figma
- **Utilities:** dotenv

---

## Design

### Original Figma Design
![Original Figma Design](githubImages/figmaDesign.png)

Designed to explore various aspects of web development, the layout focused on accessibility, mobile-first responsiveness, and simplicity.
However its by no way ginnished and the crurent design will most likely not be the finnaly product.

---

## Features (so far)

- ✅ User registration and login with encrypted passwords  
- ✅ JWT-based authentication  
- ✅ Secure and structured backend with Express and MongoDB  

---

## How to Run Locally

1. **Clone the repository**

    ```bash
    git clone https://github.com/your-username/todohub.git
    cd todohub
1. **Install dependencies**
    npm install
1. **Create .env with the following**
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key
1. **Run the app**
    npm start

## License
This project is licensed under the MIT License. See the LICENSE file for details.
