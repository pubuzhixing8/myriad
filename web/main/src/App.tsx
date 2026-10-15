import { useEffect, useState } from 'react'
import { invoke } from '@pc-nexus/bridge'

function App() {
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    invoke<string, string>('greeting', 'Nexus')
      .then((res) => setResult(res))
      .catch((err: Error) => setResult(`Error: ${err}`))
  }, [])

  return <p>{result}</p>
}

export default App
