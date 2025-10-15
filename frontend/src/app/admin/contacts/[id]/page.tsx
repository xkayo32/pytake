'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  MessageSquare,
  Tag as TagIcon,
  Shield,
  ShieldOff,
  Edit,
  Trash2,
  BarChart3,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { ActionButton } from '@/components/admin/ActionButton';
import { contactsAPI } from '@/lib/api';
import { Contact, ContactStats } from '@/types/contact';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContactDetails = async () => {
    try {
      setIsLoading(true);
      const [contactResponse, statsResponse] = await Promise.all([
        contactsAPI.get(contactId),
        contactsAPI.getStats(contactId),
      ]);
      setContact(contactResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Erro ao carregar detalhes do contato:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContactDetails();
  }, [contactId]);

  const handleBlock = async () => {
    if (!confirm('Bloquear este contato?')) return;
    try {
      await contactsAPI.block(contactId, 'Bloqueado pelo administrador');
      fetchContactDetails();
    } catch (error) {
      console.error('Erro ao bloquear contato:', error);
    }
  };

  const handleUnblock = async () => {
    try {
      await contactsAPI.unblock(contactId);
      fetchContactDetails();
    } catch (error) {
      console.error('Erro ao desbloquear contato:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Deletar este contato permanentemente?')) return;
    try {
      await contactsAPI.delete(contactId);
      router.push('/admin/contacts');
    } catch (error) {
      console.error('Erro ao deletar contato:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Contato não encontrado</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {contact.name || contact.whatsapp_name || 'Sem nome'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              Contato desde {format(new Date(contact.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              {contact.is_blocked ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 ml-2">
                  Bloqueado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ml-2">
                  Ativo
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
              {contact.is_blocked ? (
                <ActionButton
                  onClick={handleUnblock}
                  variant="success"
                  icon={Shield}
                >
                  Desbloquear
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={handleBlock}
                  variant="secondary"
                  icon={ShieldOff}
                >
                  Bloquear
                </ActionButton>
              )}
              <ActionButton
                onClick={() => {/* TODO: Editar */}}
                variant="secondary"
                icon={Edit}
              >
                Editar
              </ActionButton>
              <ActionButton
                onClick={handleDelete}
                variant="danger"
                icon={Trash2}
              >
                Deletar
              </ActionButton>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Conversas"
          value={stats?.total_conversations || 0}
          subtitle="Total de conversas"
          icon={MessageSquare}
          color="blue"
        />
        <StatsCard
          title="Mensagens"
          value={stats?.total_messages || 0}
          subtitle="Trocadas"
          icon={MessageSquare}
          color="orange"
        />
        <StatsCard
          title="Tempo Resposta"
          value={stats?.avg_response_time_minutes ? `${stats.avg_response_time_minutes.toFixed(0)}min` : '-'}
          subtitle="Média"
          icon={BarChart3}
          color="blue"
        />
        <StatsCard
          title="Última Interação"
          value={stats?.last_interaction ? formatDistanceToNow(new Date(stats.last_interaction), { addSuffix: true, locale: ptBR }) : 'Nunca'}
          subtitle="Atividade"
          icon={Calendar}
          color="green"
        />
      </div>

      {/* Informações do Contato */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Informações Pessoais */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            Informações Pessoais
          </h2>

          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">WhatsApp</div>
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                  {contact.whatsapp_id}
                </div>
              </div>
            </div>

            {contact.email && (
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Email</div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {contact.email}
                  </div>
                </div>
              </div>
            )}

            {contact.phone_number && (
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Telefone</div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {contact.phone_number}
                  </div>
                </div>
              </div>
            )}

            {contact.company && (
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Empresa</div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {contact.company}
                  </div>
                  {contact.job_title && (
                    <div className="text-sm text-gray-500">{contact.job_title}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Endereço */}
        {(contact.address_street || contact.address_city) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço
            </h2>

            <div className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              {contact.address_street && <div>{contact.address_street}</div>}
              <div>
                {contact.address_city && <span>{contact.address_city}</span>}
                {contact.address_state && <span>, {contact.address_state}</span>}
              </div>
              {contact.address_postal_code && <div>{contact.address_postal_code}</div>}
              {contact.address_country && <div>{contact.address_country}</div>}
            </div>
          </div>
        )}

        {/* Notas */}
        {contact.notes && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 lg:col-span-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TagIcon className="w-4 h-4" />
              Notas
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {contact.notes}
            </p>
          </div>
        )}
      </div>

      {/* Timeline / Histórico de Atividades */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Histórico de Atividades
        </h2>
        <div className="text-center py-8 text-gray-500">
          Timeline de atividades será implementado em breve
        </div>
      </div>
    </div>
  );
}
