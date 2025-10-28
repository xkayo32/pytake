'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import PropertyModal, { PropertyModalTrigger } from './PropertyModal';
import AvailableVariables from './AvailableVariables';
import { Code, Settings, Info, Play, CheckCircle2, XCircle, Package } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';

interface ScriptPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
  nodes?: Node[];
  edges?: Edge[];
}

const validateVariableName = (value: string): boolean => {
  return /^[a-z][a-z0-9_]*$/.test(value);
};

// Python libraries available in Pyodide
const PYTHON_LIBRARIES = [
  { name: 'pandas', description: 'Análise de dados', size: '~15MB' },
  { name: 'numpy', description: 'Computação numérica', size: '~8MB' },
  { name: 'scipy', description: 'Computação científica', size: '~30MB' },
  { name: 'matplotlib', description: 'Visualização', size: '~20MB' },
  { name: 'scikit-learn', description: 'Machine Learning', size: '~35MB' },
  { name: 'regex', description: 'Expressões regulares', size: '~1MB' },
  { name: 'pytz', description: 'Fusos horários', size: '~500KB' },
];

// Load Pyodide for Python execution
let pyodideInstance: any = null;
let loadedPackages: Set<string> = new Set();

const loadPyodide = async () => {
  if (pyodideInstance) return pyodideInstance;

  try {
    // @ts-ignore
    const pyodide = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
    });
    pyodideInstance = pyodide;
    return pyodide;
  } catch (error) {
    throw new Error('Falha ao carregar Python (Pyodide)');
  }
};

const loadPythonPackages = async (packages: string[]) => {
  const pyodide = await loadPyodide();
  const toLoad = packages.filter(pkg => !loadedPackages.has(pkg));

  if (toLoad.length > 0) {
    await pyodide.loadPackage(toLoad);
    toLoad.forEach(pkg => loadedPackages.add(pkg));
  }

  return pyodide;
};

export default function ScriptProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
  nodes = [],
  edges = [],
}: ScriptPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [scriptCode, setScriptCode] = useState(data?.scriptCode || '');
  const [scriptLanguage, setScriptLanguage] = useState(data?.scriptLanguage || 'javascript');
  const [outputVariable, setOutputVariable] = useState(data?.outputVariable || '');
  const [description, setDescription] = useState(data?.description || '');
  const [timeout, setTimeout] = useState(data?.timeout || 5000);
  const [pythonPackages, setPythonPackages] = useState<string[]>(data?.pythonPackages || []);
  const [testResult, setTestResult] = useState<{ success: boolean; result: any; error?: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingPyodide, setIsLoadingPyodide] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setScriptCode(data?.scriptCode || '');
    setScriptLanguage(data?.scriptLanguage || 'javascript');
    setOutputVariable(data?.outputVariable || '');
    setDescription(data?.description || '');
    setTimeout(data?.timeout || 5000);
    setPythonPackages(data?.pythonPackages || []);
    setTestResult(null);
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      scriptCode,
      scriptLanguage,
      outputVariable,
      description,
      timeout,
      pythonPackages,
      nodeType,
      label,
    });
  }, [nodeId, scriptCode, scriptLanguage, outputVariable, description, timeout, pythonPackages]);

  // Test context with example variables
  const getTestContext = () => ({
    nome_cliente: 'João Silva',
    idade: 30,
    email: 'joao@exemplo.com',
    is_vip: true,
    produtos: ['Produto A', 'Produto B'],
    dados_api: { status: 'success', value: 42 },
    database_result: [
      { id: 1, name: 'Item 1', preco: 100 },
      { id: 2, name: 'Item 2', preco: 200 },
    ],
  });

  // Test JavaScript execution
  const testJavaScript = (code: string) => {
    const context = getTestContext();
    const wrappedCode = `
      try {
        ${code}
      } catch (error) {
        throw new Error('Erro na execução: ' + (error && error.message ? error.message : String(error)));
      }
    `;

    // Filter out any function values from context to avoid passing executable references
    const safeContextEntries = Object.entries(context).filter(([, v]) => typeof v !== 'function');
    const safeContext = Object.fromEntries(safeContextEntries);

    const fn = new Function(...Object.keys(safeContext), wrappedCode);
    try {
      return fn(...Object.values(safeContext));
    } catch (err: any) {
      throw new Error('Erro na execução do script JS: ' + (err?.message || String(err)));
    }
  };

  // Test Python execution
  const testPython = async (code: string) => {
    setIsLoadingPyodide(true);
    try {
      // Load Pyodide
      setLoadingMessage('Carregando Python...');
      const pyodide = await loadPyodide();

      // Load selected packages
      if (pythonPackages.length > 0) {
        setLoadingMessage(`Carregando bibliotecas: ${pythonPackages.join(', ')}...`);
        await loadPythonPackages(pythonPackages);
      }

      setLoadingMessage('Executando código...');
      const context = getTestContext();

      // Set variables in Python namespace
      // Set variables in Python namespace (filter out functions)
      for (const [key, value] of Object.entries(context).filter(([, v]) => typeof v !== 'function')) {
        pyodide.globals.set(key, value as any);
      }

      // Execute Python code
      const result = pyodide.runPython(code);
      setIsLoadingPyodide(false);
      setLoadingMessage('');
      return result;
    } catch (error: any) {
      setIsLoadingPyodide(false);
      setLoadingMessage('');
      throw error;
    }
  };

  // Test script execution
  const handleTestScript = async () => {
    if (!scriptCode.trim()) {
      setTestResult({
        success: false,
        result: null,
        error: 'Script vazio',
      });
      return;
    }

    try {
      let result;
      if (scriptLanguage === 'javascript') {
        result = testJavaScript(scriptCode);
      } else if (scriptLanguage === 'python') {
        result = await testPython(scriptCode);
      }

      setTestResult({
        success: true,
        result: result,
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        result: null,
        error: error.message,
      });
    }
  };

  // Toggle Python package
  const togglePackage = (pkg: string) => {
    setPythonPackages(prev =>
      prev.includes(pkg)
        ? prev.filter(p => p !== pkg)
        : [...prev, pkg]
    );
  };

  // Get placeholder based on language
  const getPlaceholder = () => {
    if (scriptLanguage === 'javascript') {
      return `// Todas as variáveis estão disponíveis diretamente
// Exemplo 1: Formatar texto
return nome_cliente.toUpperCase();

// Exemplo 2: Processar array
return produtos.join(', ');

// Exemplo 3: Extrair de objeto
return dados_api.value * 2;

// Exemplo 4: Processar resultado do banco
return database_result.map(item => item.name).join(', ');

// O valor retornado será salvo em {{${outputVariable || 'resultado'}}}`;
    } else {
      return `# Todas as variáveis estão disponíveis diretamente
# Exemplo 1: Formatar texto
nome_cliente.upper()

# Exemplo 2: Processar array
', '.join(produtos)

# Exemplo 3: Com pandas (se selecionado)
import pandas as pd
df = pd.DataFrame(database_result)
df['preco'].sum()

# A última expressão será o resultado salvo em {{${outputVariable || 'resultado'}}}`;
    }
  };

  // Script editor component (reusable in modal and inline)
  const ScriptEditor = ({ isFullscreen = false }: { isFullscreen?: boolean }) => (
    <div className="space-y-4">
      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Descrição (opcional)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Formatar nome completo do cliente"
          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Ajuda a identificar o que este script faz
        </p>
      </div>

      {/* Language Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Linguagem
        </label>
        <select
          value={scriptLanguage}
          onChange={(e) => setScriptLanguage(e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {scriptLanguage === 'javascript'
            ? '⚡ JavaScript - Execução rápida no navegador'
            : '🐍 Python - Requer carregamento do Pyodide (~10MB)'}
        </p>
      </div>

      {/* Python Packages Selector */}
      {scriptLanguage === 'python' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Package className="w-3 h-3 inline mr-1" />
            Bibliotecas Python (opcional)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PYTHON_LIBRARIES.map(lib => (
              <label
                key={lib.name}
                className={`flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                  pythonPackages.includes(lib.name)
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={pythonPackages.includes(lib.name)}
                  onChange={() => togglePackage(lib.name)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    {lib.name}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {lib.description} ({lib.size})
                  </p>
                </div>
              </label>
            ))}
          </div>
          {pythonPackages.length > 0 && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Bibliotecas selecionadas: {pythonPackages.join(', ')} - Serão baixadas na primeira execução
            </p>
          )}
        </div>
      )}

      {/* Script Code */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Código {scriptLanguage === 'javascript' ? 'JavaScript' : 'Python'}
          </label>
          <div className="flex items-center gap-2">
            {!isFullscreen && (
              <PropertyModalTrigger onClick={() => setIsModalOpen(true)} />
            )}
            <button
              type="button"
              onClick={handleTestScript}
              disabled={isLoadingPyodide}
              className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-3 h-3" />
              {isLoadingPyodide ? 'Testando...' : 'Testar'}
            </button>
          </div>
        </div>

        {/* Loading Message */}
        {isLoadingPyodide && loadingMessage && (
          <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
            {loadingMessage}
          </div>
        )}

        <textarea
          value={scriptCode}
          onChange={(e) => setScriptCode(e.target.value)}
          rows={isFullscreen ? 25 : 12}
          placeholder={getPlaceholder()}
          className="w-full px-3 py-2 bg-gray-900 dark:bg-gray-950 border border-gray-600 dark:border-gray-700 rounded-lg text-sm text-green-400 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          💡 {scriptLanguage === 'javascript'
            ? 'Use return para definir o valor final'
            : 'A última expressão será o valor retornado'}
        </p>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className={`p-3 rounded-lg border ${
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {testResult.success ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-900 dark:text-green-300">
                  ✅ Teste executado com sucesso
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-xs font-medium text-red-900 dark:text-red-300">
                  ❌ Erro na execução
                </span>
              </>
            )}
          </div>
          {testResult.success ? (
            <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded font-mono text-xs text-green-900 dark:text-green-300 break-words">
              <strong>Resultado:</strong> {JSON.stringify(testResult.result, null, 2)}
            </div>
          ) : (
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded font-mono text-xs text-red-900 dark:text-red-300 break-words">
              {testResult.error}
            </div>
          )}
        </div>
      )}

      {/* Output Variable */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Salvar resultado em
        </label>
        <input
          type="text"
          value={outputVariable}
          onChange={(e) => setOutputVariable(e.target.value)}
          placeholder="nome_variavel"
          className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:border-transparent ${
            validateVariableName(outputVariable)
              ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-indigo-500'
              : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-900 dark:text-red-400 focus:ring-red-500'
          }`}
        />
        {!validateVariableName(outputVariable) && outputVariable && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            ⚠️ Use apenas letras minúsculas, números e underscore (_). Deve começar com letra.
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          O resultado ficará disponível como {`{{${outputVariable || 'resultado'}}}`}
        </p>
      </div>
    </div>
  );

  const tabs: Tab[] = [
    {
      id: 'script',
      label: 'Script',
      icon: Code,
      content: <ScriptEditor />,
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Timeout */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timeout (ms)
            </label>
            <input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(Number(e.target.value))}
              min={100}
              max={30000}
              step={100}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tempo máximo de execução (padrão: 5000ms = 5s)
            </p>
          </div>

          {/* Language Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              📝 Linguagens Suportadas
            </p>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-400">
              <p>• <strong>JavaScript:</strong> Execução nativa no navegador (rápido)</p>
              <p>• <strong>Python:</strong> Execução via Pyodide/WebAssembly (requer download ~10MB)</p>
              <p>• <strong>Bibliotecas Python:</strong> pandas, numpy, scipy, scikit-learn, matplotlib, etc.</p>
            </div>
          </div>

          {/* Security Warning */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs font-medium text-yellow-900 dark:text-yellow-300 mb-2">
              ⚠️ Segurança
            </p>
            <div className="space-y-1 text-xs text-yellow-800 dark:text-yellow-400">
              <p>• Scripts são executados em sandbox limitado</p>
              <p>• Não há acesso a APIs externas ou sistema de arquivos</p>
              <p>• Use apenas para transformação de dados</p>
              <p>• Para integrações externas, use o nó "API Call"</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'examples',
      label: 'Exemplos',
      icon: Info,
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
            <p className="text-xs font-medium text-indigo-900 dark:text-indigo-300 mb-3">
              💡 Casos de Uso Comuns - {scriptLanguage === 'javascript' ? 'JavaScript' : 'Python'}
            </p>

            {scriptLanguage === 'javascript' ? (
              <>
                {/* JavaScript Examples */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                    1. Formatar nome completo
                  </p>
                  <pre className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded text-xs text-indigo-900 dark:text-indigo-300 overflow-x-auto">
{`// Entrada: primeiro_nome, ultimo_nome
return primeiro_nome + ' ' + ultimo_nome;`}
                  </pre>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                    2. Processar array de produtos
                  </p>
                  <pre className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded text-xs text-indigo-900 dark:text-indigo-300 overflow-x-auto">
{`// Entrada: produtos = ['A', 'B', 'C']
return produtos.length + ' produtos: ' + produtos.join(', ');`}
                  </pre>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                    3. Processar resultado do banco
                  </p>
                  <pre className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded text-xs text-indigo-900 dark:text-indigo-300 overflow-x-auto">
{`// Entrada: database_result = [{id: 1, name: 'A'}, ...]
return database_result.map(item => item.name).join(' e ');`}
                  </pre>
                </div>
              </>
            ) : (
              <>
                {/* Python Examples */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                    1. Análise com Pandas
                  </p>
                  <pre className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded text-xs text-indigo-900 dark:text-indigo-300 overflow-x-auto">
{`import pandas as pd

# Converter resultado do banco em DataFrame
df = pd.DataFrame(database_result)

# Calcular estatísticas
df['preco'].sum()  # Total de preços`}
                  </pre>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                    2. Processamento com NumPy
                  </p>
                  <pre className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded text-xs text-indigo-900 dark:text-indigo-300 overflow-x-auto">
{`import numpy as np

# Extrair preços
precos = [item['preco'] for item in database_result]

# Calcular média e desvio padrão
np.mean(precos), np.std(precos)`}
                  </pre>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                    3. Formatar texto
                  </p>
                  <pre className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded text-xs text-indigo-900 dark:text-indigo-300 overflow-x-auto">
{`# Entrada: database_result
names = [item['name'] for item in database_result]
', '.join(names)`}
                  </pre>
                </div>
              </>
            )}
          </div>

          {/* Available Variables */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Variáveis Disponíveis
            </h5>
            <AvailableVariables nodes={nodes} edges={edges} selectedNodeId={nodeId} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <PropertyTabs tabs={tabs} defaultTab="script" />

      {/* Fullscreen Modal */}
      <PropertyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Editor de Script - ${scriptLanguage === 'javascript' ? 'JavaScript' : 'Python'}`}
        subtitle={description || 'Configure seu script personalizado'}
      >
        <ScriptEditor isFullscreen />
      </PropertyModal>
    </>
  );
}
