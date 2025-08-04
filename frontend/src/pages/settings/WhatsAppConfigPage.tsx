import { useState, useEffect } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { PageHeader } from "../../components/ui/page-header";
import { useToast } from "../../hooks/useToast";
import { Settings, Smartphone, Key, Link, Server, Check, X } from "lucide-react";

interface WhatsAppConfig {
  provider: "official" | "evolution";
  official: {
    enabled: boolean;
    phone_number_id: string;
    access_token: string;
    webhook_verify_token: string;
    business_id: string;
  };
  evolution: {
    enabled: boolean;
    base_url: string;
    api_key: string;
    instance_name: string;
    webhook_url: string;
  };
}

export function WhatsAppConfigPage() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<WhatsAppConfig>({
    provider: "evolution",
    official: {
      enabled: false,
      phone_number_id: "",
      access_token: "",
      webhook_verify_token: "",
      business_id: "",
    },
    evolution: {
      enabled: true,
      base_url: "",
      api_key: "",
      instance_name: "",
      webhook_url: "",
    },
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/v1/settings/whatsapp", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/settings/whatsapp", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        showToast("Configurações salvas com sucesso!", "success");
      } else {
        throw new Error("Falha ao salvar configurações");
      }
    } catch (error) {
      showToast("Erro ao salvar configurações", "error");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/v1/settings/whatsapp/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        showToast("Conexão testada com sucesso!", "success");
      } else {
        throw new Error(result.error || "Falha no teste de conexão");
      }
    } catch (error: any) {
      showToast(error.message || "Erro ao testar conexão", "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuração do WhatsApp"
        description="Configure as APIs do WhatsApp Business"
        icon={Smartphone}
      />

      {/* Provider Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Selecione o Provedor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setConfig({ ...config, provider: "official" })}
            className={`p-4 border-2 rounded-lg transition-all ${
              config.provider === "official"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <h4 className="font-semibold mb-2">WhatsApp Business API Oficial</h4>
            <p className="text-sm text-muted-foreground">
              API oficial do Meta/Facebook
            </p>
          </button>
          
          <button
            onClick={() => setConfig({ ...config, provider: "evolution" })}
            className={`p-4 border-2 rounded-lg transition-all ${
              config.provider === "evolution"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <h4 className="font-semibold mb-2">Evolution API</h4>
            <p className="text-sm text-muted-foreground">
              API alternativa open-source
            </p>
          </button>
        </div>
      </Card>

      {/* Official API Configuration */}
      {config.provider === "official" && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">WhatsApp Business API Oficial</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm">Ativo</span>
              <Switch
                checked={config.official.enabled}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    official: { ...config.official, enabled: checked },
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Phone Number ID</label>
              <Input
                placeholder="1234567890123456"
                value={config.official.phone_number_id}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    official: { ...config.official, phone_number_id: e.target.value },
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Access Token</label>
              <Input
                type="password"
                placeholder="EAAxxxxxxxxx..."
                value={config.official.access_token}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    official: { ...config.official, access_token: e.target.value },
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Webhook Verify Token</label>
              <Input
                placeholder="my_verify_token"
                value={config.official.webhook_verify_token}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    official: { ...config.official, webhook_verify_token: e.target.value },
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Business ID</label>
              <Input
                placeholder="1234567890123456"
                value={config.official.business_id}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    official: { ...config.official, business_id: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </Card>
      )}

      {/* Evolution API Configuration */}
      {config.provider === "evolution" && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Evolution API</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm">Ativo</span>
              <Switch
                checked={config.evolution.enabled}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    evolution: { ...config.evolution, enabled: checked },
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">URL Base</label>
              <Input
                placeholder="http://localhost:8084"
                value={config.evolution.base_url}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    evolution: { ...config.evolution, base_url: e.target.value },
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="B6D711FCDE4D4FD5936544120E713976"
                value={config.evolution.api_key}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    evolution: { ...config.evolution, api_key: e.target.value },
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Nome da Instância</label>
              <Input
                placeholder="pytake"
                value={config.evolution.instance_name}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    evolution: { ...config.evolution, instance_name: e.target.value },
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Webhook URL (para Evolution)</label>
              <Input
                placeholder="http://localhost:8080/api/webhooks/whatsapp"
                value={config.evolution.webhook_url}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    evolution: { ...config.evolution, webhook_url: e.target.value },
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL onde o Evolution enviará os webhooks
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>

        <Button
          variant="outline"
          onClick={testConnection}
          disabled={testing || loading}
          className="flex items-center gap-2"
        >
          {testing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              Testando...
            </>
          ) : (
            <>
              <Link className="h-4 w-4" />
              Testar Conexão
            </>
          )}
        </Button>
      </div>

      {/* Connection Status */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Status da Conexão:</span>
          <span className="text-sm text-muted-foreground">
            Configure e teste a conexão para verificar o status
          </span>
        </div>
      </Card>
    </div>
  );
}