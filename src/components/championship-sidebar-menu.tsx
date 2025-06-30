
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';
import { Globe, Home, Trophy, Star } from 'lucide-react';
import { getHighlightedLeagues } from '@/actions/settings-actions';

const championships = {
  brasil: [
    'Brasileirão Série A',
    'Brasileirão Série B',
    'Copa do Brasil',
    'Campeonato Paulista',
  ],
  internacional: [
    'CONMEBOL Libertadores',
    'CONMEBOL Sul-Americana',
    'Mundial de Clubes da FIFA',
    'FIFA Club World Cup',
    'UEFA Champions League',
    'Premier League',
    'Copa do Mundo',
  ],
};


interface ChampionshipSidebarMenuProps {
  availableLeagues: string[];
}

export function ChampionshipSidebarMenu({ availableLeagues }: ChampionshipSidebarMenuProps) {
  return (
    <Suspense fallback={null}>
      <ChampionshipSidebarMenuInner availableLeagues={availableLeagues} />
    </Suspense>
  );
}

function ChampionshipSidebarMenuInner({ availableLeagues }: ChampionshipSidebarMenuProps) {
  const searchParams = useSearchParams();
  const selectedLeague = searchParams.get('league');
  const [highlightedLeagues, setHighlightedLeagues] = useState<string[]>([]);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(true);

  useEffect(() => {
    async function fetchHighlights() {
      setIsLoadingHighlights(true);
      const leagues = await getHighlightedLeagues();
      setHighlightedLeagues(leagues);
      setIsLoadingHighlights(false);
    }
    fetchHighlights();
  }, []);
  
  const highlightedLeaguesSet = new Set(highlightedLeagues);

  const championshipGroups = [
    { name: 'Brasil', list: championships.brasil, icon: Trophy },
    { name: 'Internacional', list: championships.internacional, icon: Globe },
  ];
  
  const allCategorizedLeagues = new Set(championshipGroups.flatMap(g => g.list));

  const filteredChampionshipGroups = championshipGroups.map(group => ({
      ...group,
      list: group.list.filter(league => availableLeagues.includes(league) && !highlightedLeaguesSet.has(league))
  })).filter(group => group.list.length > 0);
  
  const uncategorizedLeagues = availableLeagues
    .filter(league => !allCategorizedLeagues.has(league) && !highlightedLeaguesSet.has(league))
    .sort();

  if (uncategorizedLeagues.length > 0) {
    filteredChampionshipGroups.push({
      name: 'Outros',
      list: uncategorizedLeagues,
      icon: Globe
    });
  }

  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isInitialStateLoaded, setIsInitialStateLoaded] = useState(false);

  useEffect(() => {
    const defaultOpen = ['Destaques', ...filteredChampionshipGroups.map(g => g.name)];
    try {
        const storedState = localStorage.getItem('sidebarOpenMenus');
        setOpenMenus(storedState ? JSON.parse(storedState) : defaultOpen);
    } catch {
        setOpenMenus(defaultOpen);
    }
    setIsInitialStateLoaded(true);
  }, [availableLeagues]);

  useEffect(() => {
    if (isInitialStateLoaded) {
        try {
            localStorage.setItem('sidebarOpenMenus', JSON.stringify(openMenus));
        } catch (error) {
            console.error("Failed to save sidebar state to localStorage:", error);
        }
    }
  }, [openMenus, isInitialStateLoaded]);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  return (
    <>
      {isLoadingHighlights ? (
         <SidebarMenuItem>
            <SidebarMenuSkeleton showIcon />
         </SidebarMenuItem>
      ) : highlightedLeagues.length > 0 && (
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => toggleMenu('Destaques')}
            data-state={openMenus.includes('Destaques') ? 'open' : 'closed'}
          >
            <Star />
            <span>Destaques</span>
          </SidebarMenuButton>
          {openMenus.includes('Destaques') && (
            <SidebarMenuSub>
              {highlightedLeagues.map((league) => (
                <SidebarMenuSubItem key={league}>
                  <SidebarMenuSubButton
                    href={`/bet?league=${encodeURIComponent(league)}`}
                    isActive={selectedLeague === league}
                  >
                    <span>{league}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      )}

      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={!selectedLeague}>
            <Link href="/bet">
                <Home />
                <span>Todas as Partidas</span>
            </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {filteredChampionshipGroups.map((group) => (
        <SidebarMenuItem key={group.name}>
          <SidebarMenuButton
            onClick={() => toggleMenu(group.name)}
            data-state={openMenus.includes(group.name) ? 'open' : 'closed'}
          >
            <group.icon />
            <span>{group.name}</span>
          </SidebarMenuButton>
          {openMenus.includes(group.name) && (
            <SidebarMenuSub>
              {group.list.map((league) => (
                <SidebarMenuSubItem key={league}>
                  <SidebarMenuSubButton
                    href={`/bet?league=${encodeURIComponent(league)}`}
                    isActive={selectedLeague === league}
                  >
                    <span>{league}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      ))}
    </>
  );
}
