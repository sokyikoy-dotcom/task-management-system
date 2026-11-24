# Taskflow Task Management

A lightweight task management application for organizing work in one place. Create tasks with descriptions, priorities, and due dates; track progress; and quickly find work with status filters and search.

## Features

- Create, edit, complete, and delete tasks
- Optional descriptions and due dates
- Low, medium, and high priority labels
- All, Active, and Completed filters
- Search task titles and descriptions
- Responsive interface with loading, error, and empty states
- MongoDB-backed persistence and Docker Compose deployment

## Tech stack

- **Frontend:** Vue 3, Vite, Axios
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB 7
- **Deployment:** Docker Compose and Nginx

## Project structure

```text
.
├── backend/
│   ├── config/db.js
│   ├── controllers/taskController.js
│   ├── models/Task.js
│   ├── routes/taskRoutes.js
│   ├── server.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── App.vue
│   │   └── style.css
│   └── .env.example
├── nginx/default.conf
├── docker-compose.yml
└── docker-compose.local.yml
```

## API

The API is served from `/api/tasks`.

| Method | Endpoint | Description | Success response |
| --- | --- | --- | --- |
| `GET` | `/api/tasks` | List tasks, newest first | `200` and a task array |
| `POST` | `/api/tasks` | Create a task | `201` and the created task |
| `PUT` | `/api/tasks/:id` | Update task fields | `200` and the updated task |
| `DELETE` | `/api/tasks/:id` | Delete a task | `200` and a confirmation message |
| `GET` | `/health` | Check backend availability | `200` and `{ "status": "ok" }` |

Task fields:

| Field | Type | Rules |
| --- | --- | --- |
| `title` | String | Required, trimmed, up to 120 characters |
| `description` | String | Optional, up to 500 characters |
| `priority` | String | `low`, `medium`, or `high`; defaults to `medium` |
| `dueDate` | Date | Optional |
| `completed` | Boolean | Defaults to `false` |
| `createdAt`, `updatedAt` | Date | Maintained automatically |

Invalid task IDs return `400`; valid IDs for missing tasks return `404`. Validation errors return `400`, and unexpected server errors return JSON with status `500`.

## Run locally with Docker

Install Docker Desktop, start Docker, and run these commands from the project root:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.local.yml ps
```

Open the frontend at [http://localhost:8081](http://localhost:8081). The backend health endpoint is [http://localhost:5000/health](http://localhost:5000/health).

Stop the local services with:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml down
```

MongoDB data is stored in the `mongo_data` Docker volume and remains available after stopping the services.

## Environment variables

| Variable | Used by | Description | Example |
| --- | --- | --- | --- |
| `PORT` | Backend | HTTP port for the API | `5000` |
| `MONGODB_URI` | Backend | MongoDB connection string | `mongodb://db:27017/taskdb` |
| `VITE_API_URL` | Frontend | API base URL, embedded when the frontend is built | `http://localhost:5000` |

Example files are provided at `backend/.env.example` and `frontend/.env.example`. Docker Compose supplies the backend values and sets the frontend URL through its build argument. The local Compose override uses `http://localhost:5000`.

## AWS deployment overview

1. Choose a domain and create DNS records in Route 53 (or your DNS provider) for `frontend.your-domain.example`, `api.your-domain.example`, and `backend.your-domain.example`.
2. Deploy the Docker Compose stack on an EC2 instance, or run the containers in an AWS container service. Keep MongoDB data on persistent storage; for production, consider Amazon DocumentDB or a managed MongoDB service.
3. Configure an Application Load Balancer with an ACM TLS certificate and forward traffic to the Nginx service. The included Nginx config routes the frontend hostname to the frontend container and both API hostnames to the backend.
4. Before building the frontend for production, set `VITE_API_URL` to `https://api.your-domain.example`. Vite embeds this value at build time.
5. Replace the sample `myproject.site` hostnames in `nginx/default.conf` and the production frontend build argument in `docker-compose.yml` with your domain values. The frontend server block accepts both the root domain and `frontend.myproject.site`.
6. Verify the deployment at the live app and API URLs, and restrict database access to the application network.

Live links (replace these placeholders after deployment):

- [Frontend](https://frontend.your-domain.example)
- [API](https://api.your-domain.example)
- [Backend alias](https://backend.your-domain.example)

## Troubleshooting

- **The frontend cannot reach the API:** Confirm `VITE_API_URL` is correct. Since it is embedded at build time, rebuild the frontend after changing it.
- **The backend cannot connect to MongoDB:** Check that the database container is healthy and `MONGODB_URI` uses the Docker service name `db` when running Compose.
- **The app is not available on the expected port:** Run `docker compose -f docker-compose.yml -f docker-compose.local.yml ps` and check for port conflicts on `8081` or `5000`.
- **A task request returns `400`:** Check that the title is not blank, the priority is one of the supported values, and any supplied task ID is a valid MongoDB ObjectId.
- **A task request returns `404`:** The task ID is valid, but no matching task exists.
- **Nginx routes to the wrong service:** Confirm the request Host header matches a `server_name` in `nginx/default.conf`, then restart the stack after configuration changes.
