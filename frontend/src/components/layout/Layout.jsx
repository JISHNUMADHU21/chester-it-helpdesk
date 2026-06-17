import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--bg)',
          minWidth: 0,
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}