
'use server';
/**
 * @fileOverview A Genkit flow for generating "Who is the Player?" games.
 *
 * - generatePlayerGame: A function that generates player data based on a theme.
 * - PlayerGenerationInput: The input type for the generatePlayerGame function.
 * - PlayerGenerationOutput: The return type for the generatePlayerGame function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const PlayerGenerationInputSchema = z.object({
  theme: z.string().describe('A theme or description for the player to be generated, e.g., "um atacante famoso do Corinthians" or "um campeão do mundo pela Argentina em 2022".'),
});
export type PlayerGenerationInput = z.infer<typeof PlayerGenerationInputSchema>;

const PlayerGenerationOutputSchema = z.object({
  playerName: z.string().describe("The player's most common name."),
  hints: z.array(z.string()).min(5).max(7).describe("An array of 5 to 7 interesting and progressively easier hints about the player."),
  nationality: z.string().length(2).describe("The player's two-letter ISO country code (e.g., BR, AR, PT).").transform(v => v.toUpperCase()),
});
export type PlayerGenerationOutput = z.infer<typeof PlayerGenerationOutputSchema>;


export async function generatePlayerGame(input: PlayerGenerationInput): Promise<PlayerGenerationOutput> {
  return playerGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'playerGameGeneratorPrompt',
  input: {schema: PlayerGenerationInputSchema},
  output: {schema: PlayerGenerationOutputSchema},
  prompt: `Você é um especialista em futebol mundial. Sua tarefa é gerar os dados para um jogo de "Quem é o Jogador?" com base no tema fornecido.

O tema é: {{{theme}}}

- Forneça de 5 a 7 dicas interessantes e progressivamente mais fáceis sobre o jogador.
- Forneça o código do país de duas letras da nacionalidade do jogador (padrão ISO 3166-1 alfa-2).
- O nome do jogador deve ser o nome mais comum pelo qual ele é conhecido.
- Todo o texto deve estar em português do Brasil.
- Retorne o resultado estritamente no formato JSON solicitado.
`,
});

const playerGeneratorFlow = ai.defineFlow(
  {
    name: 'playerGeneratorFlow',
    inputSchema: PlayerGenerationInputSchema,
    outputSchema: PlayerGenerationOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("A IA não conseguiu gerar os dados para o jogador.");
    }
    return output;
  }
);
