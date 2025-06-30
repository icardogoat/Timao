
'use server';
/**
 * @fileOverview A Genkit flow for generating quiz questions using AI.
 *
 * - generateQuizQuestions: A function that generates quiz questions based on a theme.
 * - QuizGenerationInput: The input type for the generateQuizQuestions function.
 * - QuizGenerationOutput: The return type for the generateQuizQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const QuizGenerationInputSchema = z.object({
  theme: z.string().describe('The central theme for the quiz questions, e.g., "História do Corinthians".'),
  questionCount: z.number().int().min(1).max(10).describe('The number of questions to generate.'),
});
export type QuizGenerationInput = z.infer<typeof QuizGenerationInputSchema>;

const QuizQuestionSchema = z.object({
  question: z.string().describe('The question text.'),
  options: z.array(z.string()).length(4).describe('An array of exactly 4 possible answers.'),
  answer: z.number().min(0).max(3).describe('The 0-based index of the correct answer in the options array.'),
});

const QuizGenerationOutputSchema = z.array(QuizQuestionSchema);
export type QuizGenerationOutput = z.infer<typeof QuizGenerationOutputSchema>;

export async function generateQuizQuestions(input: QuizGenerationInput): Promise<QuizGenerationOutput> {
  return quizGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'quizGeneratorPrompt',
  input: {schema: QuizGenerationInputSchema},
  output: {schema: QuizGenerationOutputSchema},
  prompt: `Você é um especialista em criar quizzes divertidos e desafiadores.
Sua tarefa é gerar {{{questionCount}}} perguntas de múltipla escolha sobre o tema fornecido.
Cada pergunta deve ter exatamente 4 opções de resposta, e você deve indicar qual é a correta.
O tema é: {{{theme}}}

As perguntas devem ser em português do Brasil.
A dificuldade deve ser variada, de fácil a difícil.
Retorne o resultado estritamente no formato JSON solicitado.`,
});

const quizGeneratorFlow = ai.defineFlow(
  {
    name: 'quizGeneratorFlow',
    inputSchema: QuizGenerationInputSchema,
    outputSchema: QuizGenerationOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output || [];
  }
);
