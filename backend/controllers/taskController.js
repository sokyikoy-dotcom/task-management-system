const mongoose = require('mongoose');
const Task = require('../models/Task');

const editableFields = ['title', 'description', 'priority', 'dueDate', 'completed'];

function getEditableFields(body) {
  const updates = {};

  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = field === 'dueDate' && body[field] === '' ? null : body[field];
    }
  }

  return updates;
}

function sendError(res, error, fallbackMessage) {
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: fallbackMessage });
}

async function getTasks(req, res) {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (error) {
    return sendError(res, error, 'Failed to fetch tasks');
  }
}

async function createTask(req, res) {
  const body = req.body || {};
  if (typeof body.title !== 'string' || !body.title.trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }

  try {
    const task = await Task.create(getEditableFields(body));
    return res.status(201).json(task);
  } catch (error) {
    return sendError(res, error, 'Failed to create task');
  }
}

function validateTaskId(req, res) {
  if (mongoose.isObjectIdOrHexString(req.params.id)) {
    return true;
  }

  res.status(400).json({ message: 'Invalid task id' });
  return false;
}

async function updateTask(req, res) {
  if (!validateTaskId(req, res)) return;

  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      getEditableFields(req.body || {}),
      { new: true, runValidators: true },
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json(task);
  } catch (error) {
    return sendError(res, error, 'Failed to update task');
  }
}

async function deleteTask(req, res) {
  if (!validateTaskId(req, res)) return;

  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json({ message: 'Task deleted' });
  } catch (error) {
    return sendError(res, error, 'Failed to delete task');
  }
}

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
