import type { AppProps } from 'next/app'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  const navItems = [
    { href: '/',            label: 'Schedule',  icon: '📅' },
    { href: '/employees',   label: 'Employees', icon: '👥' },
    { href: '/settings',    label: 'Shifts',    icon: '⚙️' },
  ]

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">💊</div>
            <div>
              <div className="sidebar-logo-text">PharmaRoster</div>
              <div className="sidebar-logo-sub">Schedule Optimizer</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${router.pathname === item.href ? 'active' : ''}`}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="main-content">
          <Component {...pageProps} />
        </main>
      </div>
    </>
  )
}
