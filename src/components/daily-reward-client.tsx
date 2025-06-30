
'use client';

import { useSession } from "next-auth/react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useEffect, useState, useRef } from "react";
import { Gift, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { claimDailyReward } from "@/actions/ad-actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import type { ApiSettings } from "@/types";

export function DailyRewardClient({ apiSettings }: { apiSettings: Partial<ApiSettings> }) {
    const { data: session, update: updateSession } = useSession();
    const { toast } = useToast();
    const [isClaimedToday, setIsClaimedToday] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [adStepIndex, setAdStepIndex] = useState(-1); // -1: initial, 0: first video, etc.
    const videoRef = useRef<HTMLVideoElement>(null);

    const ads = apiSettings.dailyRewardAds || [];
    const totalAds = ads.length;

    useEffect(() => {
        if (session?.user?.dailyRewardLastClaimed) {
            const lastClaimedDate = new Date(session.user.dailyRewardLastClaimed);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            setIsClaimedToday(lastClaimedDate >= today);
        } else if (session) {
            setIsClaimedToday(false);
        }
    }, [session]);

    // Reset ad step when dialog is closed
    useEffect(() => {
        if (!isDialogOpen) {
            setTimeout(() => setAdStepIndex(-1), 300); // Reset after dialog close animation
        }
    }, [isDialogOpen]);

    const handleClaim = async () => {
        setIsSubmitting(true);
        const result = await claimDailyReward();
        if (result.success) {
            toast({
                title: 'Recompensa Resgatada!',
                description: result.message,
            });
            await updateSession(); // Refresh session data
            setIsDialogOpen(false);
        } else {
            toast({
                title: 'Erro',
                description: result.message,
                variant: 'destructive',
            });
        }
        setIsSubmitting(false);
    }
    
    const handleVideoEnd = () => {
        setAdStepIndex(prevIndex => prevIndex + 1);
    };
    
    // Auto-play video when step changes
    useEffect(() => {
        if (adStepIndex >= 0 && adStepIndex < totalAds && videoRef.current) {
            videoRef.current.play().catch(error => {
                console.error("Video autoplay failed:", error);
            });
        }
    }, [adStepIndex, totalAds]);

    const renderDialogContent = () => {
        if (totalAds === 0) {
             return (
                 <div className="text-center py-8">
                    <p className="mb-4 text-muted-foreground">Sua recompensa diária está pronta!</p>
                    <Button onClick={handleClaim} disabled={isSubmitting} className="w-full">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Resgatar R$ 100,00
                    </Button>
                </div>
            );
        }
        
        if (adStepIndex === -1) { // Initial state
            return (
                <div className="text-center py-8">
                    <p className="mb-4 text-muted-foreground">Assista {totalAds} vídeo(s) curto(s) para liberar sua recompensa.</p>
                    <Button onClick={() => setAdStepIndex(0)}>Começar</Button>
                </div>
            );
        }

        if (adStepIndex >= 0 && adStepIndex < totalAds) { // Video playing state
            const currentAd = ads[adStepIndex];
            return (
                <div className="text-center">
                    <p className="mb-2 text-sm text-muted-foreground">Assistindo anúncio {adStepIndex + 1} de {totalAds}...</p>
                    <video 
                        ref={videoRef}
                        key={currentAd.id}
                        width="468" 
                        height="80" 
                        onEnded={handleVideoEnd}
                        controls={false}
                        muted
                        playsInline
                        className="w-full aspect-video bg-black rounded-md"
                    >
                        <source src={currentAd.url} type="video/mp4" />
                        Seu navegador não suporta a tag de vídeo.
                    </video>
                </div>
            );
        }
        
        if (adStepIndex >= totalAds) { // Claimable state
             return (
                <div className="text-center py-8">
                    <p className="mb-4 text-muted-foreground">Obrigado! Sua recompensa está pronta para ser resgatada.</p>
                    <Button onClick={handleClaim} disabled={isSubmitting} className="w-full">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Resgatar R$ 100,00
                    </Button>
                </div>
            );
        }
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    Recompensa Diária
                </CardTitle>
                <CardDescription>
                    Assista a alguns anúncios em vídeo e ganhe R$ 100,00 todos os dias.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                         <Button className="w-full" disabled={isClaimedToday}>
                            {isClaimedToday ? 'Recompensa já resgatada hoje' : 'Obter Recompensa'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Sua Recompensa Diária</DialogTitle>
                            {totalAds > 0 && (
                                <DialogDescription>
                                    Obrigado por apoiar a plataforma! Siga os passos para resgatar seu prêmio.
                                </DialogDescription>
                            )}
                        </DialogHeader>
                        <div className="py-4">
                            {renderDialogContent()}
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
