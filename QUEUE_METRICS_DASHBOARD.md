# Dashboard de Métricas - Componentes

## ✅ Implementação Completa

### Componentes Criados

#### 1. **QueueMetricsCard** 
`/frontend/src/components/admin/QueueMetricsCard.tsx`

Card completo de métricas para uma fila individual com:
- **Métricas de Volume**: Total, Hoje, Na Fila, Fechadas Hoje
- **Tempos Médios**: Espera, Resposta, Resolução
- **SLA Compliance**: Taxa, violações, barra de progresso visual
- **Qualidade**: Taxa de resolução, CSAT score
- **Gráfico de Volume**: Distribuição por hora (últimas 24h)

**Props:**
```typescript
interface QueueMetricsCardProps {
  queueId: string;
  queueName: string;
  days?: number; // Período de análise (padrão: 30)
}
```

**Exemplo de uso:**
```tsx
<QueueMetricsCard 
  queueId="abc-123" 
  queueName="Suporte Técnico"
  days={30}
/>
```

**Features:**
- ✅ Loading state com skeleton
- ✅ Error handling
- ✅ Auto-refresh (botão Atualizar)
- ✅ Formatação inteligente de tempo (5s, 3min, 2h 15min)
- ✅ Cores dinâmicas para SLA (verde/amarelo/vermelho)
- ✅ Tooltip no gráfico de volume (hover)
- ✅ Gráfico de barras puro CSS (sem biblioteca externa)

---

#### 2. **QueueComparison**
`/frontend/src/components/admin/QueueComparison.tsx`

Comparação lado-a-lado de múltiplas filas:
- **Visão Geral**: Volume, conversas em fila
- **Comparação Relativa**: Indicadores visuais (↑ Acima/↓ Abaixo da média)
- **Métricas Principais**: SLA, Espera, Resolução, CSAT
- **Identificação Visual**: Cores e ícones das filas

**Props:**
```typescript
interface QueueComparisonProps {
  queues: Queue[];
  days?: number;
}
```

**Exemplo de uso:**
```tsx
<QueueComparison 
  queues={[queue1, queue2, queue3]}
  days={7}
/>
```

**Features:**
- ✅ Carregamento paralelo de métricas
- ✅ Cálculo automático de médias
- ✅ Indicadores de tendência (melhor/pior que média)
- ✅ Setas e cores semânticas
- ✅ Hover effects

---

#### 3. **PeriodSelector**
`/frontend/src/components/admin/PeriodSelector.tsx`

Seletor de período para filtrar métricas:
- **Períodos**: Hoje (1d), 7 dias, 30 dias, 90 dias
- **UI**: Toggle buttons estilo iOS

**Props:**
```typescript
interface PeriodSelectorProps {
  value: number;
  onChange: (days: number) => void;
}
```

**Exemplo de uso:**
```tsx
const [period, setPeriod] = useState(30);

<PeriodSelector value={period} onChange={setPeriod} />
```

---

### Tipos TypeScript

Adicionados em `/frontend/src/types/queue.ts`:

```typescript
export interface QueueVolumeMetrics {
  hour: number;
  count: number;
}

export interface QueueMetrics {
  // Volume
  total_conversations: number;
  conversations_today: number;
  conversations_7d: number;
  conversations_30d: number;
  queued_now: number;
  active_now: number;
  closed_today: number;
  
  // Tempos (em segundos)
  avg_wait_time: number | null;
  avg_response_time: number | null;
  avg_resolution_time: number | null;
  
  // SLA
  sla_violations_today: number;
  sla_violations_7d: number;
  sla_compliance_rate: number | null;
  
  // Qualidade
  resolution_rate: number | null;
  csat_score: number | null;
  
  // Volume por hora
  volume_by_hour: QueueVolumeMetrics[];
}
```

---

### Integração na Página de Filas

**Arquivo:** `/frontend/src/app/admin/queues/page.tsx`

**Mudanças:**
- ✅ Adicionado sistema de tabs (Lista / Analytics)
- ✅ Seletor de período no tab Analytics
- ✅ QueueComparison no topo
- ✅ QueueMetricsCard para cada fila ativa
- ✅ State management para tab e período

**Navegação:**
1. Acessar `/admin/queues`
2. Clicar na aba "Analytics"
3. Selecionar período (1d, 7d, 30d, 90d)
4. Ver comparação + métricas detalhadas

---

### API Integration

**Endpoint usado:** `GET /api/v1/queues/{queue_id}/metrics?days=30`

**Client method:** `queuesAPI.getMetrics(id, { days })`

**Response schema:** Corresponde exatamente ao `QueueMetrics` TypeScript

---

## 📊 Visualizações Implementadas

### 1. Métricas de Volume
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 📊 Total    │ 📈 Hoje     │ 👥 Na Fila  │ ✅ Fechadas │
│    1,234    │      45     │      12     │      38     │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### 2. Tempos Médios
```
⏱️ Tempos Médios
┌──────────────┬──────────────┬──────────────┐
│ Espera       │ Resposta     │ Resolução    │
│ 🟢 2min      │ 🟡 8min      │ 🔴 35min     │
└──────────────┴──────────────┴──────────────┘
```

### 3. SLA Compliance
```
🎯 SLA Compliance                           95%
Violações Hoje: 2        7 dias: 12

████████████████████░░░░  (95%)
```

### 4. Gráfico de Volume 24h
```
   │          ▂▃▅
 50│        ▅ ███
   │      ▃ ████▃
 25│    ▂▅ █████▅
   │  ▁▁▁███████▃▁
  0└──────────────────────
    0h 4h 8h 12h 16h 20h
```

### 5. Comparação entre Filas
```
┌──────────────────────────────────────┐
│ 🔴 Suporte Técnico                   │
│ 45 conversas hoje · 12 na fila       │
├──────────────────────────────────────┤
│ SLA      Espera    Resolução   CSAT  │
│ 95% ↑    2m ↓      35m ↑       4.5★  │
│ Acima    Abaixo    Acima              │
└──────────────────────────────────────┘
```

---

## 🎨 Design System

### Cores Semânticas

**SLA Compliance:**
- 🟢 Verde (`text-green-600`): ≥ 90%
- 🟡 Amarelo (`text-yellow-600`): 70-89%
- 🔴 Vermelho (`text-red-600`): < 70%

**Tempos:**
- 🟢 Verde: < 5 min
- 🟡 Amarelo: 5-15 min
- 🔴 Vermelho: > 15 min

**Tendências:**
- 🟢 Verde: Melhor que média
- 🔴 Vermelho: Pior que média
- ⚪ Cinza: Na média

### Ícones (Lucide React)
- `Activity` - Volume total
- `TrendingUp` - Conversas hoje
- `Users` - Na fila
- `CheckCircle` - Fechadas/Qualidade
- `Clock` - Tempos
- `Target` - SLA
- `BarChart3` - Métricas gerais
- `ArrowUpRight`/`ArrowDownRight` - Tendências

---

## 🚀 Como Testar

### 1. Navegação
```bash
# Acessar a página
http://localhost:3000/admin/queues

# Clicar na aba "Analytics"
```

### 2. Verificar Métricas
- Verificar se os cards de métricas carregam
- Testar seletor de período (1d, 7d, 30d, 90d)
- Validar cores SLA (verde/amarelo/vermelho)
- Hover no gráfico de volume para ver tooltips

### 3. Comparação
- Ver ranking de filas
- Verificar indicadores de tendência (↑↓)
- Comparar performance relativa

---

## ✅ Status da Task #6

**Dashboard de Métricas - Componentes: COMPLETO**

### Checklist:
- [x] QueueMetricsCard com gráficos visuais
- [x] Gráfico de linha (volume 24h) - implementado com CSS puro
- [x] Indicadores de tempo médio com cores
- [x] Gauge SLA (barra de progresso visual)
- [x] Rating CSAT (estrelas)
- [x] QueueComparison para múltiplas filas
- [x] PeriodSelector (hoje, 7d, 30d, 90d)
- [x] Integração na página /admin/queues
- [x] Tipos TypeScript completos
- [x] Error handling e loading states
- [x] Responsive design

### Decisões Técnicas:
1. **Sem Recharts/Chart.js**: Implementado gráfico de volume com CSS puro para evitar dependência extra. Suficiente para MVP.
2. **Client-side rendering**: Métricas carregadas via API, permite refresh dinâmico.
3. **Período configurável**: 1-90 dias via query param `?days=X`.
4. **Lazy loading**: Cada métrica carrega independentemente.

---

## 🔜 Próximos Passos (Task #7)

**Página de Analytics de Filas** - Funcionalidades adicionais:
- [ ] Exportar relatórios CSV/PDF
- [ ] Gráficos avançados (Recharts para comparações complexas)
- [ ] Filtros por departamento
- [ ] Drill-down por fila → conversas individuais

---

## 🧯 Overflow e Capacidade (Follow-up)

Objetivo: melhorar a visibilidade operacional quando uma fila atinge a capacidade máxima e para onde o tráfego está sendo transbordado.

- Badge de status na lista de filas:
  - "Overflow ativo" quando `queued_conversations >= max_queue_size`.
  - Cores: vermelho (atingiu/ultrapassou), amarelo (próximo: ≥ 80% da capacidade), verde (normal).
- Indicador de capacidade por fila:
  - Barra ou chip exibindo `queued_conversations / max_queue_size` e porcentagem.
  - Tooltip com: fila de overflow alvo (nome/slug) e link para ela.
- Integração com métricas:
  - Exibir taxa de overflow (conversas transbordadas no período) e tendência.
  - Gráfico pequeno de ocupação ao longo do dia (sparklines CSS).
- Atualização em tempo real:
  - Reutilizar o auto-refresh existente (10s) e/ou WebSocket para eventos de fila.

Escopo: apenas UI (leitura). Não altera backend — aproveita os campos existentes: `max_queue_size`, `overflow_queue_id`, `queued_conversations`.

---

## 📦 Arquivos Modificados

```
frontend/
  src/
    types/
      queue.ts                                    # +QueueMetrics types
    components/
      admin/
        QueueMetricsCard.tsx                      # NEW (400+ linhas)
        QueueComparison.tsx                       # NEW (250+ linhas)
        PeriodSelector.tsx                        # NEW (40 linhas)
    app/
      admin/
        queues/
          page.tsx                                # Modified (tabs + analytics)
```

**Total:** 3 componentes novos, 1 tipo atualizado, 1 página modificada
