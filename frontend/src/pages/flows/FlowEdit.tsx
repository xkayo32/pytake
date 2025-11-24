import { useParams } from 'react-router-dom'

export default function FlowEdit() {
  const { id } = useParams()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Editar Fluxo {id}</h1>
      <p className="text-slate-600">Editor de fluxo em desenvolvimento.</p>
    </div>
  )
}
