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

## AWS deployment guide

1. **Launch an EC2 instance.** Select Ubuntu Server 24.04 LTS, instance type `t3.small`, and a 20 GiB EBS root volume.
2. **Create and select a key pair.** Download and securely keep the private key; use it to connect to the instance over SSH.
3. **Configure the security group.** Allow inbound TCP ports 22 (SSH), 80 (HTTP), and 443 (HTTPS). Restrict SSH to your own IP address where possible.
4. **Allocate an Elastic IP** and associate it with the instance. Use this stable address for the DNS names and deployment configuration.
5. **Connect to the instance and install Docker and Git:**

   ```bash
   sudo apt update
   sudo apt install -y docker.io docker-compose-v2 git
   sudo systemctl enable --now docker
   sudo usermod -aG docker "$USER"
   newgrp docker
   ```

6. **Clone the repository:**

   ```bash
   git clone https://github.com/sokyikoy-dotcom/task-management-system.git
   cd task-management-system
   ```

7. **Set the Elastic IP as the deployment hostname.** Set `ELASTIC_IP` to the address you associated with the instance, then replace the sample hostname in Nginx and the Compose configuration:

   ```bash
   ELASTIC_IP=52.63.241.68
   sed -i "s/myproject.site/${ELASTIC_IP}.nip.io/g" nginx/default.conf docker-compose.yml
   ```

   Replace the example address with your Elastic IP if it differs.

8. **Build and start the services** from the repository root:

   ```bash
   docker compose up -d --build
   ```

   Check the containers with `docker compose ps` and review startup output with `docker compose logs`.

`nip.io` is a free wildcard DNS service: `<ip>.nip.io` and its subdomains resolve to that IP address. This lets the app use hostnames for the frontend, API, and backend without purchasing a domain.

Live links:

- [Frontend](http://52.63.241.68.nip.io)
- [Backend health check](http://backend.52.63.241.68.nip.io/health)
- [API tasks](http://api.52.63.241.68.nip.io/api/tasks)

HTTPS can be added later with Certbot or Caddy.

## Challenges and solutions

- **Small disk:** The initial EBS volume was too small, so it was resized to 20 GiB.
- **Not enough RAM on `t3.micro`:** The instance was upgraded to `t3.small` and swap was added to provide additional memory headroom.
- **Changing public IP:** An Elastic IP keeps the address stable across instance stops and starts.
- **Frontend API URL changes:** `VITE_API_URL` is embedded when Vite builds the frontend. Rebuild the frontend after changing it so the deployed app uses the new API URL.

## Troubleshooting

- **The frontend cannot reach the API:** Confirm `VITE_API_URL` is correct. Since it is embedded at build time, rebuild the frontend after changing it.
- **The backend cannot connect to MongoDB:** Check that the database container is healthy and `MONGODB_URI` uses the Docker service name `db` when running Compose.
- **The app is not available on the expected port:** Run `docker compose -f docker-compose.yml -f docker-compose.local.yml ps` and check for port conflicts on `8081` or `5000`.
- **A task request returns `400`:** Check that the title is not blank, the priority is one of the supported values, and any supplied task ID is a valid MongoDB ObjectId.
- **A task request returns `404`:** The task ID is valid, but no matching task exists.
- **Nginx routes to the wrong service:** Confirm the request Host header matches a `server_name` in `nginx/default.conf`, then restart the stack after configuration changes.
