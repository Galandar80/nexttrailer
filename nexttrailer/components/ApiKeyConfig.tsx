
import { useState } from "react";
import { Settings, X } from "lucide-react";
import { useApiKeyStore } from "@/store/useApiKeyStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ApiKeyConfig = () => {
  const { apiKey, setApiKey, accessToken, setAccessToken } = useApiKeyStore();
  const [open, setOpen] = useState(false);
  const [inputKey, setInputKey] = useState(apiKey);
  const [inputToken, setInputToken] = useState(accessToken);
  const [activeTab, setActiveTab] = useState("apikey");
  const { toast } = useToast();
  
  const handleSave = () => {
    const trimmedKey = inputKey.trim();
    const trimmedToken = inputToken.trim();
    
    if (trimmedKey !== apiKey) {
      setApiKey(trimmedKey);
    }
    
    if (trimmedToken !== accessToken) {
      setAccessToken(trimmedToken);
    }
    
    toast({
      title: "Configurazione salvata",
      description: "La tua API key e access token sono stati salvati con successo.",
    });
    
    setOpen(false);
    
    // Ricarica la pagina per applicare le nuove impostazioni
    window.location.reload();
  };

  const handleClearAPIKey = () => {
    setInputKey("");
  };
  
  const handleClearToken = () => {
    setInputToken("");
  };

  const handleResetDefault = () => {
    setInputKey("f3a3f66b6f9697a5a908d86c607ba115");
    setInputToken("eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmM2EzZjY2YjZmOTY5N2E1YTkwOGQ4NmM2MDdiYTExNSIsIm5iZiI6MTc0MzI3MTMwMS45ODcsInN1YiI6IjY3ZTgzNTg1NjIxNDUyNWNkNTYzOGNmNSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.V3uqyFMxYc-dOO50-qECpuGlSagrYTLyZObb43XG-Sc");
    
    toast({
      title: "Ripristino configurazione predefinita",
      description: "API key e access token sono stati reimpostati ai valori predefiniti.",
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg bg-background hover:bg-secondary"
        onClick={() => setOpen(true)}
      >
        <Settings className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configura TMDB API</DialogTitle>
            <DialogDescription>
              Per visualizzare i contenuti reali da TMDB, è necessaria una API key. 
              La tua API key è già configurata e pronta all&apos;uso.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="apikey" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="apikey">API Key</TabsTrigger>
              <TabsTrigger value="token">Access Token</TabsTrigger>
            </TabsList>
            
            <TabsContent value="apikey" className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-foreground mb-1">
                  TMDB API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    id="apiKey"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Inserisci la tua API key"
                    className="flex-1"
                  />
                  {inputKey && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleClearAPIKey}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  API key attualmente in uso: {apiKey.substring(0, 8)}...
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="token" className="space-y-4">
              <div>
                <label htmlFor="accessToken" className="block text-sm font-medium text-foreground mb-1">
                  TMDB Access Token
                </label>
                <div className="flex gap-2">
                  <Input
                    id="accessToken"
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value)}
                    placeholder="Inserisci il tuo access token"
                    className="flex-1"
                  />
                  {inputToken && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleClearToken}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Token in uso: {accessToken.substring(0, 15)}...
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={handleResetDefault}>
              Ripristina default
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleSave}>
                Salva
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApiKeyConfig;
