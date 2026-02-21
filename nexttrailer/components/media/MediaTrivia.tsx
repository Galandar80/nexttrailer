
import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, AlertCircle, Sparkles } from "lucide-react";

interface MediaTriviaProps {
    trivia: {
        facts: string[];
        controversies: string[];
    };
    showTrivia: boolean;
    onToggleTrivia: () => void;
}

export const MediaTrivia = ({ trivia, showTrivia, onToggleTrivia }: MediaTriviaProps) => {
    return (
        <div className="mt-8 border-t border-muted/20 pt-8">
            <Button
                variant="ghost"
                className="w-full flex justify-between items-center p-4 h-auto hover:bg-muted/10 border border-muted/20 rounded-lg group"
                onClick={onToggleTrivia}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-purple-900/30 p-2 rounded-full group-hover:bg-purple-900/50 transition-colors">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-semibold text-purple-100">Curiosità & Dietro le Quinte</h3>
                        <p className="text-sm text-muted-foreground">Scopri fatti interessanti e controversie (Generato da AI)</p>
                    </div>
                </div>
                {showTrivia ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
            </Button>

            {showTrivia && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-secondary/10 p-6 rounded-xl border border-secondary/20 hover:border-accent/30 transition-colors">
                        <h4 className="font-semibold text-accent mb-4 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Fatti Interessanti
                        </h4>
                        <ul className="space-y-3">
                            {trivia.facts.map((fact, index) => (
                                <li key={index} className="text-sm text-gray-300 flex gap-2 items-start">
                                    <span className="text-accent mt-1">•</span>
                                    <span>{fact}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-secondary/10 p-6 rounded-xl border border-secondary/20 hover:border-red-500/30 transition-colors">
                        <h4 className="font-semibold text-red-400 mb-4 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Controversie & Dibattiti
                        </h4>
                        <ul className="space-y-3">
                            {trivia.controversies.map((item, index) => (
                                <li key={index} className="text-sm text-gray-300 flex gap-2 items-start">
                                    <span className="text-red-400 mt-1">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};
