# ToDoHub Development Roadmap

> A tracing documentation of ToDoHub, from start to finish.

---

## Phase 1: Initial Setup

- ✅ Designed the UI prototype in **Figma**
- ✅ Set up project structure: - `public/` (with `assets/`, `css/`, `jsComponents/`) - `server/` (with `models/`, `routes/`, `uploads/`)
- ✅ Created basic REST API endpoints with **Node.js** and **Express**
- ✅ Connected to local **MongoDB** using **Mongoose**
- ✅ Built initial frontend layout for **login** and **register** pages with vanilla HTML/CSS/JS

---

## Phase 2: Authentication System

### Backend

- ✅ Created `/register` and `/login` routes in **authentication.js**
- ✅ Set up JWT token generation on login
- ✅ Added `.env` file for secrets like `JWT_SECRET` and `MONGODB_URI`
- ✅ Implemented password hashing using **bcrypt**

### Frontend

- ✅ Connected frontend to backend API
- ✅ Handled form submission and token reception
- ✅ Initially stored JWT tokens in `localStorage`  
   _(Note: Later changed for security)_

---

## Phase 3: Security

- ✅ Removed insecure `localStorage` token usage (prone to XSS)
- ✅ Switched to **HttpOnly cookies** for JWT storage
- ✅ Updated `/login` route to set the cookie securely
- ✅ Added `/logout` route to clear the authentication cookie
- ✅ Created `/api/check` route to verify the cookie's token
- ✅ Built `authCheck.js` (frontend) to:
- ✅ Automatically call `/api/check` on page load and API calls because of (credentials: 'include')
- ✅ Redirect to login if authentication fails
- ✅ Cookie options:
    - `httpOnly: true`
    - `sameSite: 'Strict'`
    - `secure: false` (for local dev, set to `true` in production)
    - `domain: none` (for local dev, set your `domainName` in production)

---

## Phase 4: More security & Session Management (In Progress)

- [ ] Fix server-side **SQL injection risks**
- ✅ Add **refresh token system** for re-authentication
- [ ] Show **session expiration warning** or auto-logout message in frontend
- ✅ Display **UI feedback** on logout (redirect message)
- [ ] Add **visual loading indicator** while checking authentication state

> **Note:** I got a bit stuck on the security dilemma and wasn’t sure what to add since this is mainly a showcase project for now, so this setup is sufficient.

---

## Phase 5: Profile Picture Upload & Media Handling

- ✅ Connect to **Supabase** for image storage
- [ ] Create frontend **file upload** component
- ✅ Add automatic **`.webp` image conversion** for better performance (somewhat already in the code but not used)
- ✅ Extend user schema to include **image URL**
- ✅ Implement **image preview & validation** before upload (already exists but not checked of because the other things don't work)

---

## Phase 6: UI Theme & Personalization

- ✅ Add **light/dark mode toggle** using CSS variables
- [ ] Build "framework?" for **user-customizable themes** (Don't know how im gonna do this, maybe i just make users select the colors they want to use)
- [ ] Polish UI and responsiveness
- ✅ Add **custom icons**(fontawesome)

---

## Phase 7: Return to Core

- [ ] Resume work on **index/dashboard page**
- ✅ Create layout and navigation 
- ✅ Fix routing 
- [ ] Fix content of every section 
---

## Other: Production Readiness

- [ ] Set `secure: true` and proper domain for production cookies
- [ ] Host frontend with HTTPS support
- [ ] Add `.env.production` and secure configuration for deployment
