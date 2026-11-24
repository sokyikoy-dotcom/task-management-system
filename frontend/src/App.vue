<!-- Created by Sokyi -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import api from './api'

const tasks = ref([])
const title = ref('')
const description = ref('')
const priority = ref('medium')
const dueDate = ref('')
const editingId = ref(null)
const editDraft = ref({ title: '', description: '', priority: 'medium', dueDate: '' })
const activeFilter = ref('all')
const searchQuery = ref('')
const loading = ref(true)
const saving = ref(false)
const deletingId = ref(null)
const errorMessage = ref('')

const completedCount = computed(() => tasks.value.filter((task) => task.completed).length)
const activeCount = computed(() => tasks.value.length - completedCount.value)
const filteredTasks = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()

  return tasks.value.filter((task) => {
    const matchesFilter = activeFilter.value === 'all'
      || (activeFilter.value === 'active' && !task.completed)
      || (activeFilter.value === 'completed' && task.completed)
    const matchesSearch = !query
      || `${task.title} ${task.description || ''}`.toLocaleLowerCase().includes(query)

    return matchesFilter && matchesSearch
  })
})

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback
}

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function taskDateInputValue(value) {
  return value ? String(value).slice(0, 10) : ''
}

function formatDueDate(value) {
  const date = new Date(`${taskDateInputValue(value)}T12:00:00`)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(task) {
  return !task.completed && task.dueDate && taskDateInputValue(task.dueDate) < localDateString()
}

async function loadTasks() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await api.get('/api/tasks')
    tasks.value = response.data
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Could not load tasks. Please try again.')
  } finally {
    loading.value = false
  }
}

function clearNewTask() {
  title.value = ''
  description.value = ''
  priority.value = 'medium'
  dueDate.value = ''
}

async function addTask() {
  const taskTitle = title.value.trim()
  if (!taskTitle || saving.value) return

  saving.value = true
  errorMessage.value = ''

  try {
    const response = await api.post('/api/tasks', {
      title: taskTitle,
      description: description.value.trim(),
      priority: priority.value,
      dueDate: dueDate.value || null,
    })
    tasks.value.unshift(response.data)
    clearNewTask()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Could not add the task. Please try again.')
  } finally {
    saving.value = false
  }
}

function startEditing(task) {
  editingId.value = task._id
  editDraft.value = {
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'medium',
    dueDate: taskDateInputValue(task.dueDate),
  }
  errorMessage.value = ''
}

function cancelEditing() {
  editingId.value = null
  editDraft.value = { title: '', description: '', priority: 'medium', dueDate: '' }
}

async function saveTask(task) {
  const taskTitle = editDraft.value.title.trim()
  if (!taskTitle || saving.value) return

  saving.value = true
  errorMessage.value = ''

  try {
    const response = await api.put(`/api/tasks/${task._id}`, {
      title: taskTitle,
      description: editDraft.value.description.trim(),
      priority: editDraft.value.priority,
      dueDate: editDraft.value.dueDate || null,
      completed: task.completed,
    })
    const taskIndex = tasks.value.findIndex((item) => item._id === task._id)
    if (taskIndex !== -1) tasks.value[taskIndex] = response.data
    cancelEditing()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Could not update the task. Please try again.')
  } finally {
    saving.value = false
  }
}

async function toggleCompleted(task) {
  errorMessage.value = ''

  try {
    const response = await api.put(`/api/tasks/${task._id}`, {
      completed: !task.completed,
    })
    const taskIndex = tasks.value.findIndex((item) => item._id === task._id)
    if (taskIndex !== -1) tasks.value[taskIndex] = response.data
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Could not update the task status. Please try again.')
  }
}

async function deleteTask(task) {
  if (!window.confirm(`Delete "${task.title}"? This action cannot be undone.`)) return

  deletingId.value = task._id
  errorMessage.value = ''

  try {
    await api.delete(`/api/tasks/${task._id}`)
    tasks.value = tasks.value.filter((item) => item._id !== task._id)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Could not delete the task. Please try again.')
  } finally {
    deletingId.value = null
  }
}

onMounted(loadTasks)
</script>

<template>
  <main class="page-shell">
    <header class="topbar">
      <div class="brand-group">
        <a class="brand" href="/" aria-label="Taskflow home">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span>taskflow</span>
        </a>
        <span class="creator-pill">Created by <strong>Sokyi</strong></span>
      </div>
      <span class="topbar-label">PERSONAL WORKSPACE</span>
    </header>

    <section class="content">
      <div class="intro">
        <p class="eyebrow">YOUR DAY, IN FOCUS</p>
        <h1>Make room for<br /><span>what matters.</span></h1>
        <p class="intro-copy">A little progress each day adds up to big results.</p>
      </div>

      <section class="task-panel" aria-labelledby="task-list-heading">
        <div class="panel-heading">
          <div>
            <h2 id="task-list-heading">Your tasks</h2>
            <p class="task-count">
              <template v-if="tasks.length">
                {{ completedCount }} of {{ tasks.length }} completed
              </template>
              <template v-else>Keep your next steps in one place</template>
            </p>
          </div>
          <span class="count-badge">{{ tasks.length }}</span>
        </div>

        <form class="add-form" @submit.prevent="addTask">
          <div class="add-title-row">
            <label class="sr-only" for="new-task">Task title</label>
            <span class="add-icon" aria-hidden="true">+</span>
            <input
              id="new-task"
              v-model="title"
              type="text"
              name="title"
              placeholder="What needs to get done?"
              maxlength="120"
              required
            />
            <button class="add-button" type="submit" :disabled="saving || !title.trim()">
              {{ saving && !editingId ? 'Adding…' : 'Add task' }}
            </button>
          </div>
          <label class="sr-only" for="new-description">Description (optional)</label>
          <textarea
            id="new-description"
            v-model="description"
            class="description-input"
            name="description"
            placeholder="Add a few details (optional)"
            maxlength="500"
            rows="2"
          ></textarea>
          <div class="form-options">
            <label class="form-control">
              <span>Priority</span>
              <select v-model="priority" name="priority">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label class="form-control">
              <span>Due date</span>
              <input v-model="dueDate" type="date" name="dueDate" />
            </label>
          </div>
        </form>

        <div v-if="errorMessage" class="error-banner" role="alert">
          <span class="error-icon" aria-hidden="true">!</span>
          <span>{{ errorMessage }}</span>
          <button class="dismiss-button" type="button" aria-label="Dismiss error" @click="errorMessage = ''">×</button>
        </div>

        <div v-if="loading" class="loading-state" role="status">
          <span class="spinner" aria-hidden="true"></span>
          <span>Loading your tasks…</span>
        </div>

        <div v-else-if="tasks.length === 0" class="empty-state">
          <div class="empty-art" aria-hidden="true">
            <svg viewBox="0 0 72 72" fill="none">
              <rect x="14" y="12" width="44" height="52" rx="8" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" />
              <path d="M25 29h22M25 37h22M25 45h13" stroke="#FF8AC8" stroke-width="3" stroke-linecap="round" />
              <circle cx="53" cy="52" r="11" fill="#7C8CFF" />
              <path d="m48.5 52 3 3 6-6" stroke="#F4F6FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h3>No tasks yet</h3>
          <p>Start with one small thing you’d like to accomplish.</p>
        </div>

        <template v-else>
          <div class="task-toolbar">
            <div class="filter-tabs" role="group" aria-label="Filter tasks">
              <button
                v-for="filter in [
                  { id: 'all', label: 'All', count: tasks.length },
                  { id: 'active', label: 'Active', count: activeCount },
                  { id: 'completed', label: 'Completed', count: completedCount },
                ]"
                :key="filter.id"
                class="filter-tab"
                :class="{ 'is-active': activeFilter === filter.id }"
                type="button"
                :aria-pressed="activeFilter === filter.id"
                @click="activeFilter = filter.id"
              >
                {{ filter.label }} <span>{{ filter.count }}</span>
              </button>
            </div>
            <label class="search-box">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" stroke-width="1.5" />
                <path d="m13.2 13.2 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
              <span class="sr-only">Search tasks</span>
              <input v-model="searchQuery" type="search" placeholder="Search tasks" />
            </label>
          </div>

          <div v-if="filteredTasks.length === 0" class="empty-state filtered-empty">
            <h3>No matching tasks</h3>
            <p>Try a different search or choose another filter.</p>
          </div>

          <ul v-else class="task-list">
            <li
              v-for="task in filteredTasks"
              :key="task._id"
              class="task-item"
              :class="{ 'is-completed': task.completed }"
            >
              <template v-if="editingId === task._id">
                <form class="edit-form" @submit.prevent="saveTask(task)">
                  <label class="sr-only" :for="`edit-title-${task._id}`">Task title</label>
                  <input
                    :id="`edit-title-${task._id}`"
                    v-model="editDraft.title"
                    class="edit-input"
                    type="text"
                    maxlength="120"
                    required
                    autofocus
                  />
                  <label class="sr-only" :for="`edit-description-${task._id}`">Description</label>
                  <textarea
                    :id="`edit-description-${task._id}`"
                    v-model="editDraft.description"
                    class="edit-input edit-description"
                    maxlength="500"
                    rows="2"
                    placeholder="Description (optional)"
                  ></textarea>
                  <div class="edit-options">
                    <label class="form-control">
                      <span>Priority</span>
                      <select v-model="editDraft.priority">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                    <label class="form-control">
                      <span>Due date</span>
                      <input v-model="editDraft.dueDate" type="date" />
                    </label>
                  </div>
                  <div class="edit-actions">
                    <button class="text-button muted" type="button" @click="cancelEditing">Cancel</button>
                    <button class="text-button primary" type="submit" :disabled="saving || !editDraft.title.trim()">
                      {{ saving ? 'Saving…' : 'Save changes' }}
                    </button>
                  </div>
                </form>
              </template>
              <template v-else>
                <button
                  class="check-button"
                  :class="{ checked: task.completed }"
                  type="button"
                  :aria-label="task.completed ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as complete`"
                  :aria-pressed="task.completed"
                  @click="toggleCompleted(task)"
                >
                  <svg v-if="task.completed" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="m3.5 8 3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
                <div class="task-details">
                  <span class="task-title">{{ task.title }}</span>
                  <p v-if="task.description" class="task-description">{{ task.description }}</p>
                  <div class="task-meta">
                    <time v-if="task.createdAt" class="task-date" :datetime="task.createdAt">
                      Added {{ new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }}
                    </time>
                    <span class="priority-badge" :class="`priority-${task.priority || 'medium'}`">
                      {{ task.priority || 'medium' }} priority
                    </span>
                    <time
                      v-if="task.dueDate"
                      class="due-date"
                      :class="{ overdue: isOverdue(task) }"
                      :datetime="taskDateInputValue(task.dueDate)"
                    >
                      {{ isOverdue(task) ? 'Overdue · ' : 'Due ' }}{{ formatDueDate(task.dueDate) }}
                    </time>
                  </div>
                </div>
                <div class="task-actions">
                  <button class="icon-button" type="button" :aria-label="`Edit ${task.title}`" @click="startEditing(task)">
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="m13.8 3.7 2.5 2.5M4 16l3.8-.8 8.6-8.6a1.8 1.8 0 0 0-2.5-2.5l-8.6 8.6L4 16Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                  <button
                    class="icon-button delete-button"
                    type="button"
                    :aria-label="`Delete ${task.title}`"
                    :disabled="deletingId === task._id"
                    @click="deleteTask(task)"
                  >
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M4.5 6h11M8 6V4.5h4V6m2.5 0-.6 9.5H6.1L5.5 6m3 2.5v4m3-4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                </div>
              </template>
            </li>
          </ul>

          <footer class="panel-footer">
            <span><span class="footer-dot"></span> {{ activeCount }} active · {{ completedCount }} completed</span>
            <span>One step at a time</span>
          </footer>
        </template>
      </section>

      <p class="bottom-note">Keep showing up. You’re doing great.</p>
    </section>
    <footer class="site-footer">
      Designed &amp; built by <span class="gradient-name">Sokyi</span> · Task Management System · 2026
    </footer>
  </main>
</template>
