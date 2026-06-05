const aiService = require('../services/ai.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');

exports.chat = asyncHandler(async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    throw new AppError('messages array is required', 400);
  }
  const result = await aiService.chat(messages, req.user);
  res.json(result);
});
