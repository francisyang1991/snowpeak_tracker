import { Router } from 'express';
import { geminiService } from '../services/gemini.js';

export const chatRoutes = Router();

/**
 * POST /api/chat
 * AI Ski Assistant
 */
chatRoutes.post('/', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (question.length > 500) {
      return res.status(400).json({ error: 'Question too long (max 500 characters)' });
    }

    const answer = await geminiService.askSkiAssistant(question);
    
    res.json({
      question,
      answer,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

/**
 * POST /api/chat/resort
 * Ask about a specific resort
 */
chatRoutes.post('/resort', async (req, res) => {
  try {
    const { resortName, question } = req.body;
    
    if (!resortName || !question) {
      return res.status(400).json({ error: 'Resort name and question are required' });
    }

    const contextualQuestion = `Regarding ${resortName} ski resort: ${question}`;
    const answer = await geminiService.askSkiAssistant(contextualQuestion);
    
    res.json({
      resort: resortName,
      question,
      answer,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Resort chat error:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

/**
 * GET /api/chat/suggestions
 * Get suggested questions for new users
 */
chatRoutes.get('/suggestions', (req, res) => {
  res.json({
    suggestions: [
      "What ski gear do I need as a beginner?",
      "How do I choose the right ski length?",
      "What's the difference between powder and groomed runs?",
      "Best time to ski to avoid crowds?",
      "How do I read a ski trail map?",
      "What does 'base depth' mean?",
      "Tips for skiing in cold weather?",
      "How do I improve my skiing technique?",
    ],
  });
});
