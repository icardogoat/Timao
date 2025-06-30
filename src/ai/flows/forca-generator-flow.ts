
'use server';
/**
 * @fileOverview A Genkit flow for generating Hangman (Forca) games.
 *
 * - generateForcaGame: A function that generates a word and a hint based on a theme.
 * - ForcaGenerationInput: The input type for the generateForcaGame function.
 * - ForcaGenerationOutput: The return type for the generateForcaGame function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ForcaGenerationInputSchema = z.object({
  theme: z.string().describe('The theme for the word to be generated, e.g., "ídolos do Corinthians" or "estádios de São Paulo".'),
});
export type ForcaGenerationInput = z.infer<typeof ForcaGenerationInputSchema>;

const ForcaGenerationOutputSchema = z.object({
  word: z.string().describe("The generated word or name, without special characters and preferably with 1 to 3 words max."),
  hint: z.string().describe("A concise and helpful hint for the generated word."),
});
export type ForcaGenerationOutput = z.infer<typeof ForcaGenerationOutputSchema>;


export async function generateForcaGame(input: ForcaGenerationInput): Promise<ForcaGenerationOutput> {
  return forcaGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'forcaGameGeneratorPrompt',
  input: {schema: ForcaGenerationInputSchema},
  output: {schema: ForcaGenerationOutputSchema},
  prompt: `Você é um especialista em futebol e cultura geral, focado no Corinthians. Sua tarefa é criar uma palavra e uma dica para um jogo da Forca.

O tema é: {{{theme}}}

- A palavra deve ter entre 1 e 3 palavras, no máximo.
- Remova acentos e caracteres especiais da palavra (ex: "Canção" vira "Cancao").
- A dica deve ser útil, mas não óbvia demais.
- Todo o texto deve estar em português do Brasil.
- Retorne o resultado estritamente no formato JSON solicitado.
`,
});

const forcaGeneratorFlow = ai.defineFlow(
  {
    name: 'forcaGeneratorFlow',
    inputSchema: ForcaGenerationInputSchema,
    outputSchema: ForcaGenerationOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("A IA não conseguiu gerar os dados para o jogo da forca.");
    }
    return output;
  }
);
