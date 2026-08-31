# Auth + Backend Development Workflow

1. **Ensure Docker, Frontend, and Backend are Running Successfully**

   - Make sure all necessary services are up and running.

2. **Open Prisma Studio**

   - In the backend root directory, type:
     ```sh
     npx prisma studio
     ```
   - Go to [http://localhost:5555/](http://localhost:5555/) in your browser and navigate to the `User` model.

3. **Create a User**

   - Create a user with your email address and assign the `systemRole` to `admin`.

4. **Login to the Frontend**

   - Go to the frontend and try to log in. If you are already directed to the `/chat` page, skip this step.

5. **Retrieve Auth Token**

   - Open the console and type:
     ```javascript
     const authToken = localStorage.getItem('authToken');
     console.log(authToken);
     ```

6. **Copy the Access Token**

   - Copy the access token from the console output.

7. **Authorize in API Docs**

   - Go to [http://localhost:3000/docs](http://localhost:3000/docs).
   - Click on the green "Authorize" button and paste your `authToken`.

8. **Simulate API Endpoints**

   - Use the following endpoints to simulate creating a class, adding a lecture, chatting about a lecture, etc.:
     - `/class/add`
     - `/class/material/add`
     - `/document/upload`
     - `/document/chunk`
     - `/document/chunk/status` (to validate all chunks)
     - `/document/describe`
     - `/document/embed`
     - `/document/query`

9. **Use Responses from Endpoints**
   - You might need the response from one API endpoint (e.g., `classId`) to call the next endpoint.
