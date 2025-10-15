'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { Database, Settings, Zap, Info, Play, AlertCircle } from 'lucide-react';

interface DatabaseQueryPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

export default function DatabaseQueryProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
}: DatabaseQueryPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [outputVariable, setOutputVariable] = useState(data?.outputVariable || '');
  const [connectionType, setConnectionType] = useState(data?.connectionType || 'postgres');
  const [host, setHost] = useState(data?.host || 'localhost');
  const [port, setPort] = useState(data?.port || 5432);
  const [database, setDatabase] = useState(data?.database || '');
  const [username, setUsername] = useState(data?.username || '');
  const [password, setPassword] = useState(data?.password || '');
  const [query, setQuery] = useState(data?.query || '');
  const [queryType, setQueryType] = useState(data?.queryType || 'SELECT');
  const [parameters, setParameters] = useState(data?.parameters || []);
  const [timeout, setTimeout] = useState(data?.timeout || 30);
  const [cache, setCache] = useState(data?.cache ?? false);
  const [cacheKey, setCacheKey] = useState(data?.cacheKey || '');
  const [cacheTTL, setCacheTTL] = useState(data?.cacheTTL || 300);
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setOutputVariable(data?.outputVariable || '');
    setConnectionType(data?.connectionType || 'postgres');
    setHost(data?.host || 'localhost');
    setPort(data?.port || 5432);
    setDatabase(data?.database || '');
    setUsername(data?.username || '');
    setPassword(data?.password || '');
    setQuery(data?.query || '');
    setQueryType(data?.queryType || 'SELECT');
    setParameters(data?.parameters || []);
    setTimeout(data?.timeout || 30);
    setCache(data?.cache ?? false);
    setCacheKey(data?.cacheKey || '');
    setCacheTTL(data?.cacheTTL || 300);
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      outputVariable,
      connectionType,
      host,
      port,
      database,
      username,
      password,
      query,
      queryType,
      parameters,
      timeout,
      cache,
      cacheKey,
      cacheTTL,
      nodeType,
      label,
    });
  }, [
    nodeId,
    outputVariable,
    connectionType,
    host,
    port,
    database,
    username,
    password,
    query,
    queryType,
    parameters,
    timeout,
    cache,
    cacheKey,
    cacheTTL,
  ]);

  // Auto-adjust port when connection type changes
  useEffect(() => {
    const defaultPorts: Record<string, number> = {
      postgres: 5432,
      mysql: 3306,
      mongodb: 27017,
      sqlite: 0,
    };
    if (connectionType in defaultPorts) {
      setPort(defaultPorts[connectionType]);
    }
  }, [connectionType]);

  const tabs: Tab[] = [
    {
      id: 'connection',
      label: 'Conexão',
      icon: Database,
      content: (
        <div className="space-y-4">
          {/* Output Variable */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Variável de Saída
            </label>
            <input
              type="text"
              value={outputVariable}
              onChange={(e) => setOutputVariable(e.target.value)}
              placeholder="db_result_1234"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Nome da variável onde o resultado será armazenado
            </p>
          </div>

          {/* Connection Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Banco de Dados
            </label>
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="postgres">🐘 PostgreSQL</option>
              <option value="mysql">🐬 MySQL / MariaDB</option>
              <option value="mongodb">🍃 MongoDB</option>
              <option value="sqlite">📁 SQLite</option>
            </select>
          </div>

          {/* Host and Port */}
          {connectionType !== 'sqlite' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Host
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Porta
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value) || 0)}
                  placeholder="5432"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Database Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {connectionType === 'sqlite' ? 'Caminho do Arquivo' : 'Nome do Banco'}
            </label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder={
                connectionType === 'sqlite' ? '/path/to/database.db' : 'meu_banco'
              }
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Credentials */}
          {connectionType !== 'sqlite' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Usuário
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="postgres"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  ⚠️ A senha será armazenada de forma segura no servidor
                </p>
              </div>
            </>
          )}

          {/* Test Connection Button */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/20 hover:bg-orange-200 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            Testar Conexão
          </button>
        </div>
      ),
    },
    {
      id: 'query',
      label: 'Query',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Query Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Query
            </label>
            <select
              value={queryType}
              onChange={(e) => setQueryType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="SELECT">📊 SELECT - Consultar dados</option>
              <option value="INSERT">➕ INSERT - Inserir dados</option>
              <option value="UPDATE">✏️ UPDATE - Atualizar dados</option>
              <option value="DELETE">🗑️ DELETE - Deletar dados</option>
              <option value="CUSTOM">🔧 CUSTOM - Query customizada</option>
            </select>
          </div>

          {/* Query */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Query SQL / NoSQL
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={8}
              placeholder={
                connectionType === 'mongodb'
                  ? '{ "collection": "users", "filter": { "age": { "$gt": 18 } } }'
                  : 'SELECT * FROM users WHERE active = true'
              }
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none font-mono"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {query.length} caracteres - Use {`{{variaveis}}`} para parâmetros dinâmicos
            </p>
          </div>

          {/* Timeout */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timeout (segundos)
            </label>
            <input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(parseInt(e.target.value) || 30)}
              min="1"
              max="300"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tempo máximo de execução da query (1-300 segundos)
            </p>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              💡 Dicas para Queries Seguras
            </p>
            <div className="space-y-1.5 text-xs text-blue-800 dark:text-blue-400">
              <p>• Sempre use parâmetros ao invés de concatenar valores</p>
              <p>• Evite SELECT * em produção (especifique as colunas)</p>
              <p>• Use LIMIT para queries que retornam muitos registros</p>
              <p>• Teste suas queries antes de usar no fluxo</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'advanced',
      label: 'Avançado',
      icon: Zap,
      content: (
        <div className="space-y-4">
          {/* Cache Toggle */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="cache"
              checked={cache}
              onChange={(e) => setCache(e.target.checked)}
              className="mt-1 w-4 h-4 text-orange-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex-1">
              <label
                htmlFor="cache"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Habilitar Cache
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {cache
                  ? '✅ Resultados serão armazenados em cache'
                  : '❌ Queries sempre executarão no banco'}
              </p>
            </div>
          </div>

          {/* Cache Settings */}
          {cache && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cache Key (Opcional)
                </label>
                <input
                  type="text"
                  value={cacheKey}
                  onChange={(e) => setCacheKey(e.target.value)}
                  placeholder="user_list_active"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Deixe vazio para gerar automaticamente
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cache TTL (segundos)
                </label>
                <input
                  type="number"
                  value={cacheTTL}
                  onChange={(e) => setCacheTTL(parseInt(e.target.value) || 300)}
                  min="10"
                  max="86400"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Tempo que o cache ficará válido (10 seg - 24h)
                </p>
              </div>
            </>
          )}

          {/* Info */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-xs font-medium text-purple-900 dark:text-purple-300 mb-2">
              💡 Quando usar Cache
            </p>
            <div className="space-y-2 text-xs text-purple-800 dark:text-purple-400">
              <div>
                <p className="font-medium">✅ Use cache para:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Dados que mudam pouco (categorias, configurações, listas estáticas)
                </p>
              </div>
              <div>
                <p className="font-medium">❌ Não use cache para:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Dados em tempo real (saldos, estoque, mensagens)
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'info',
      label: 'Informações',
      icon: Info,
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
              ℹ️ Sobre Database Query
            </p>
            <div className="space-y-2 text-xs text-green-800 dark:text-green-400">
              <p>
                O nó de Database Query permite executar consultas em bancos de dados
                relacionais (SQL) e NoSQL diretamente do seu fluxo.
              </p>
              <p className="mt-2">
                <strong>Importante:</strong> Os resultados são limitados a 1000 registros
                por query para evitar sobrecarga.
              </p>
            </div>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs font-medium text-yellow-900 dark:text-yellow-300 mb-2">
              ⚠️ Segurança
            </p>
            <div className="space-y-2 text-xs text-yellow-800 dark:text-yellow-400">
              <div>
                <strong>SQL Injection:</strong> Sempre use parâmetros para valores
                dinâmicos
              </div>
              <div>
                <strong>Credenciais:</strong> As senhas são criptografadas no servidor
              </div>
              <div>
                <strong>Permissões:</strong> Use usuários com permissões mínimas necessárias
              </div>
            </div>
          </div>

          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-xs font-medium text-orange-900 dark:text-orange-300 mb-2">
              🔧 Estrutura do Resultado
            </p>
            <div className="space-y-1 text-xs text-orange-800 dark:text-orange-400">
              <p>A variável de saída conterá um objeto com:</p>
              <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/40 rounded font-mono text-xs">
                {`{`}<br />
                &nbsp;&nbsp;"success": true/false,<br />
                &nbsp;&nbsp;"data": [...resultados],<br />
                &nbsp;&nbsp;"rowCount": 10,<br />
                &nbsp;&nbsp;"executionTime": "0.5s"<br />
                {`}`}
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              💡 Exemplo de Uso
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Você pode usar a query para buscar informações do usuário e então usar em nós
              seguintes com: {`{{db_result.data[0].name}}`}
            </p>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="connection" />;
}
