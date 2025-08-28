import React, { useState } from 'react'
import { Calendar, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ScheduleConfig {
  enabled: boolean
  startDate?: string
  endDate?: string
  time?: string
  weekdays: string[]
  dailyStartTime: string
  dailyEndTime: string
  skipHolidays: boolean
  holidays: string[]
  timezone: string
  pauseBetweenMessages?: number
  messagesPerBatch?: number
}

interface ScheduleConfigProps {
  value: ScheduleConfig
  onChange: (config: ScheduleConfig) => void
}

const WEEKDAYS = [
  { value: 'monday', label: 'Segunda', short: 'Seg' },
  { value: 'tuesday', label: 'Terça', short: 'Ter' },
  { value: 'wednesday', label: 'Quarta', short: 'Qua' },
  { value: 'thursday', label: 'Quinta', short: 'Qui' },
  { value: 'friday', label: 'Sexta', short: 'Sex' },
  { value: 'saturday', label: 'Sábado', short: 'Sáb' },
  { value: 'sunday', label: 'Domingo', short: 'Dom' },
]

const BRAZIL_HOLIDAYS_2024 = [
  { date: '2024-01-01', name: 'Ano Novo' },
  { date: '2024-02-12', name: 'Carnaval' },
  { date: '2024-02-13', name: 'Carnaval' },
  { date: '2024-03-29', name: 'Sexta-feira Santa' },
  { date: '2024-04-21', name: 'Tiradentes' },
  { date: '2024-05-01', name: 'Dia do Trabalho' },
  { date: '2024-05-30', name: 'Corpus Christi' },
  { date: '2024-09-07', name: 'Independência' },
  { date: '2024-10-12', name: 'Nossa Senhora' },
  { date: '2024-11-02', name: 'Finados' },
  { date: '2024-11-15', name: 'Proclamação' },
  { date: '2024-11-20', name: 'Consciência Negra' },
  { date: '2024-12-25', name: 'Natal' },
]

export function ScheduleConfigComponent({ value, onChange }: ScheduleConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customHoliday, setCustomHoliday] = useState('')

  const handleWeekdayToggle = (weekday: string) => {
    const updatedWeekdays = value.weekdays.includes(weekday)
      ? value.weekdays.filter(d => d !== weekday)
      : [...value.weekdays, weekday]
    
    onChange({
      ...value,
      weekdays: updatedWeekdays,
    })
  }

  const handleHolidayToggle = (holiday: string) => {
    const updatedHolidays = value.holidays.includes(holiday)
      ? value.holidays.filter(h => h !== holiday)
      : [...value.holidays, holiday]
    
    onChange({
      ...value,
      holidays: updatedHolidays,
    })
  }

  const addCustomHoliday = () => {
    if (customHoliday && !value.holidays.includes(customHoliday)) {
      onChange({
        ...value,
        holidays: [...value.holidays, customHoliday],
      })
      setCustomHoliday('')
    }
  }

  const getScheduleSummary = () => {
    if (!value.enabled) return 'Envio imediato'

    const parts = []
    
    if (value.startDate) {
      parts.push(`A partir de ${new Date(value.startDate).toLocaleDateString('pt-BR')}`)
    }
    
    if (value.weekdays.length > 0 && value.weekdays.length < 7) {
      const days = value.weekdays.map(d => 
        WEEKDAYS.find(w => w.value === d)?.short
      ).join(', ')
      parts.push(`Dias: ${days}`)
    }
    
    if (value.dailyStartTime && value.dailyEndTime) {
      parts.push(`${value.dailyStartTime} - ${value.dailyEndTime}`)
    }
    
    if (value.skipHolidays) {
      parts.push('Pular feriados')
    }

    return parts.length > 0 ? parts.join(' • ') : 'Configurar agendamento'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            checked={value.enabled}
            onCheckedChange={(checked) => onChange({ ...value, enabled: checked })}
          />
          <Label htmlFor="schedule-enabled" className="cursor-pointer">
            Agendar envio
          </Label>
        </div>
        
        {value.enabled && (
          <Dialog open={showAdvanced} onOpenChange={setShowAdvanced}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configuração de Agendamento</DialogTitle>
                <DialogDescription>
                  Defina quando e como as mensagens devem ser enviadas
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Período de Envio */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Período de Envio</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-date">Data Inicial</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={value.startDate}
                        onChange={(e) => onChange({ ...value, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">Data Final (opcional)</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={value.endDate}
                        onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                        min={value.startDate}
                      />
                    </div>
                  </div>
                </div>

                {/* Dias da Semana */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Dias da Semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map(day => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={day.value}
                          checked={value.weekdays.includes(day.value)}
                          onCheckedChange={() => handleWeekdayToggle(day.value)}
                        />
                        <label
                          htmlFor={day.value}
                          className="text-sm cursor-pointer select-none"
                        >
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onChange({ 
                        ...value, 
                        weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] 
                      })}
                    >
                      Dias úteis
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onChange({ 
                        ...value, 
                        weekdays: WEEKDAYS.map(d => d.value) 
                      })}
                    >
                      Todos os dias
                    </Button>
                  </div>
                </div>

                {/* Horário de Funcionamento */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Horário de Funcionamento</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-time">Início</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={value.dailyStartTime}
                        onChange={(e) => onChange({ ...value, dailyStartTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time">Fim</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={value.dailyEndTime}
                        onChange={(e) => onChange({ ...value, dailyEndTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Mensagens só serão enviadas dentro deste horário para evitar incômodos
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Feriados */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Feriados</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={value.skipHolidays}
                        onCheckedChange={(checked) => onChange({ ...value, skipHolidays: checked })}
                      />
                      <Label className="text-sm">Pular feriados</Label>
                    </div>
                  </div>
                  
                  {value.skipHolidays && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm">Feriados Nacionais 2024</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          {BRAZIL_HOLIDAYS_2024.map(holiday => (
                            <div key={holiday.date} className="flex items-center space-x-2">
                              <Checkbox
                                checked={value.holidays.includes(holiday.date)}
                                onCheckedChange={() => handleHolidayToggle(holiday.date)}
                              />
                              <label className="text-sm cursor-pointer select-none">
                                {holiday.name} ({new Date(holiday.date).toLocaleDateString('pt-BR')})
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Adicionar Feriado Customizado</Label>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={customHoliday}
                            onChange={(e) => setCustomHoliday(e.target.value)}
                          />
                          <Button onClick={addCustomHoliday} size="sm">
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Configurações Avançadas */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Configurações Avançadas</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pause">Pausa entre mensagens (segundos)</Label>
                      <Input
                        id="pause"
                        type="number"
                        min="1"
                        max="60"
                        value={value.pauseBetweenMessages || 2}
                        onChange={(e) => onChange({ 
                          ...value, 
                          pauseBetweenMessages: parseInt(e.target.value) 
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="batch">Mensagens por lote</Label>
                      <Input
                        id="batch"
                        type="number"
                        min="1"
                        max="100"
                        value={value.messagesPerBatch || 10}
                        onChange={(e) => onChange({ 
                          ...value, 
                          messagesPerBatch: parseInt(e.target.value) 
                        })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="timezone">Fuso Horário</Label>
                    <Select 
                      value={value.timezone} 
                      onValueChange={(tz) => onChange({ ...value, timezone: tz })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fuso horário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                        <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                        <SelectItem value="America/Fortaleza">Fortaleza (GMT-3)</SelectItem>
                        <SelectItem value="America/Rio_Branco">Rio Branco (GMT-5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAdvanced(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setShowAdvanced(false)}>
                  Salvar Configuração
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {value.enabled && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Agendamento Configurado</p>
              <p className="text-xs text-muted-foreground mt-1">
                {getScheduleSummary()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}