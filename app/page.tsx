export default function Home() {
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f2027',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      Redirecting...
    </div>
  )
}
