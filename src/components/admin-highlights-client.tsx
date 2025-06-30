
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { updateHighlightedLeagues } from "@/actions/settings-actions";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  highlightedLeagues: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AdminHighlightsClientProps {
    initialAvailableLeagues: string[];
    initialHighlightedLeagues: string[];
}

export default function AdminHighlightsClient({ initialAvailableLeagues, initialHighlightedLeagues }: AdminHighlightsClientProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            highlightedLeagues: initialHighlightedLeagues || [],
        },
    });

    async function onSubmit(values: FormValues) {
        setIsSubmitting(true);
        const result = await updateHighlightedLeagues(values.highlightedLeagues || []);

        if (result.success) {
            toast({
                title: "Sucesso!",
                description: result.message,
            });
        } else {
            toast({
                title: "Erro",
                description: result.message,
                variant: "destructive",
            });
        }
        setIsSubmitting(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ligas em Destaque</CardTitle>
                <CardDescription>
                    Selecione quais campeonatos devem aparecer na seção "Destaques" da barra lateral do site.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="highlightedLeagues"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Campeonatos em Destaque</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "w-full justify-between h-auto min-h-10",
                                                        !field.value?.length && "text-muted-foreground"
                                                    )}
                                                >
                                                    <div className="flex gap-1 flex-wrap">
                                                        {field.value?.length ?
                                                        initialAvailableLeagues
                                                            .filter(league => field.value?.includes(league))
                                                            .map(league => <Badge variant="secondary" key={league}>{league}</Badge>)
                                                        : "Selecione os campeonatos"
                                                        }
                                                    </div>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Pesquisar campeonato..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhum campeonato encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                        {initialAvailableLeagues.map((league) => {
                                                            const isSelected = field.value?.includes(league) ?? false;
                                                            return (
                                                                <CommandItem
                                                                    key={league}
                                                                    onSelect={() => {
                                                                        if (isSelected) {
                                                                            field.onChange(field.value?.filter((l) => l !== league));
                                                                        } else {
                                                                            field.onChange([...(field.value ?? []), league]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            isSelected ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {league}
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Destaques
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
