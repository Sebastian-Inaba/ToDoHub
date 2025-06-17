# ToDoHub  
**By Sebastian Inaba**

ToDoHub is a full-stack task management web application built with HTML, CSS, JavaScript, Node.js, Express, and MongoDB. The project demonstrates secure user authentication, CRUD functionality, responsive design, and a clean UI built from scratch.

---

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)  
- **Backend:** Node.js, Express.js  
- **Database:** MongoDB + Mongoose  
- **Image Storage:** Supabase (profile picture upload - *in progress*)  
- **Security:** Bcrypt (password hashing), JSON Web Tokens (JWT)  
- **Design Tools:** Figma  
- **Utilities:** dotenv, nodemon

---

## Design

### Original Figma Design  
![Original Figma Design](githubImages/figmaDesign.png)

Designed to explore various aspects of web development, the layout focuses on accessibility, mobile-first responsiveness, and simplicity.  
However, it is by no means finished, and the current design will most likely not be the final product.

---

## Features (So Far and Things to Note)

- ✅ User registration and login with encrypted passwords (`bcrypt`)  
- ⚙️ Profile picture upload and storage via Supabase ----------------- *currently in progress*  
- ✅ Secure and structured backend using Express and MongoDB  
- 🟥 JWT tokens currently stored in `localStorage`, which is **vulnerable to XSS attacks** – not recommended for production  
- 🟥 Login requests use `http://` in local development. In **production**, all API calls **must use `https://`** for secure communication  

---

## Deployment & Production Setup

Right now, the app connects to a local MongoDB instance for development purposes only. To run the app live and securely, follow these steps:

> **Note:** This code is not finished yet, so i don't recommend doing this at the moment.

1. **Host your backend server on Render (or a similar cloud provider)**  
   Upload your backend code (e.g., `server.js`, `models/user.js`, `routes/auth.js`, etc.) to Render. Render will run your Express server publicly.

2. **Use a cloud-hosted MongoDB instance**  
   Make sure you have a cloud database set up with MongoDB Atlas or another cloud MongoDB provider. This database is accessible 24/7 and supports secure connections. Your backend should use the connection string stored in the environment variable MONGODB_URI to connect to this cloud database.

3. **Update environment variables on Render**  
   In your Render dashboard, set the `MONGODB_URI` environment variable to the connection string of your cloud MongoDB instance. This will allow your server to connect to the remote database.

4. **Switch API requests to HTTPS in production**  
   Currently, API calls use `http://` for local development. In production, update your frontend API base URL to use `https://` to ensure secure communication with your backend.

---

## Planned Improvements and Security Notes

- Add **rate limiting** on login endpoints to prevent brute-force attacks.  
- Implement **form validation** for email formats and password strength.  
- Move JWT storage from `localStorage` to **HttpOnly, Secure cookies** to protect tokens from XSS attacks.  
- Implement **logout backend** route to securely clear authentication cookies.  
- Add **JWT refresh token support** with a dedicated backend route to issue new access tokens seamlessly and keep users logged in without re-entering credentials.  
- Update frontend logic to rely on HttpOnly cookies for authentication tokens instead of manual token storage.  
- Ensure secure cookie settings (`HttpOnly`, `Secure`, `SameSite`) are applied to prevent CSRF and token theft.  
- Integrate **light and dark mode support** using CSS variables and theme toggling for better user experience.

> **Note:** Switching to HttpOnly cookie-based authentication requires changes on both frontend and backend to maintain secure and smooth user sessions.

---

## How to Run Locally

1. **Clone the repository**

    ```bash
    git clone https://github.com/Sebastian-Inaba/ToDoHub
    cd todohub
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Create a `.env` file with the following variables**

    ```
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key

    # Supabase credentials (optional - for profile picture uploads, coming soon)
    SUPABASE_URL=your_supabase_url
    SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4. **Run the app**

    ```bash
    npm start
    ```
    or
    ```
    npm run dev  # for development mode with nodemon
    ```

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.
