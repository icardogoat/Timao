
'use client';

import { useState, useEffect } from "react";
import type { ApiSettings } from "@/types";
import { Badge } from "./ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UpdateCountdownTimerProps {
  apiSettings: Partial<ApiSettings>;
}

export function UpdateCountdownTimer({ apiSettings }: UpdateCountdownTimerProps) {
  const [timeAgo, setTimeAgo] = useState('...');

  useEffect(() => {
    const updateTimer = () => {
      if (apiSettings.lastUpdateTimestamp) {
        const lastUpdateDate = new Date(apiSettings.lastUpdateTimestamp);
        // Ensure the date is valid before formatting
        if (!isNaN(lastUpdateDate.getTime())) {
          setTimeAgo(formatDistanceToNow(lastUpdateDate, { addSuffix: true, locale: ptBR }));
        } else {
            setTimeAgo('há pouco');
        }
      } else {
        setTimeAgo('há pouco'); // Fallback if no timestamp is available
      }
    };

    updateTimer(); // Initial call
    const timer = setInterval(updateTimer, 30000); // Update every 30 seconds for accuracy

    return () => clearInterval(timer);
  }, [apiSettings.lastUpdateTimestamp]);

  return (
    <Badge variant="secondary" className="whitespace-nowrap">
      Atualizado {timeAgo}
    </Badge>
  );
}
