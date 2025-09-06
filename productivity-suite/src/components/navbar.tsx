'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { 
  Menu, 
  X, 
  Apps, 
  Home, 
  Folder, 
  Settings, 
  LogOut,
  ChevronDown
} from 'lucide-react'

export default function Navbar() {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAppsDropdownOpen, setIsAppsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAppsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const apps = [
    { name: 'Documents', href: '/apps/documents', icon: '📄' },
    { name: 'Spreadsheets', href: '/apps/spreadsheets', icon: '📊' },
    { name: 'Presentations', href: '/apps/presentations', icon: '📽️' },
    { name: 'Forms', href: '/apps/forms', icon: '📋' },
    { name: 'Notebook', href: '/apps/notebook', icon: '📝' },
    { name: 'Drive', href: '/apps/drive', icon: '📁' },
    { name: 'Analytics', href: '/apps/analytics', icon: '📈' }
  ]

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Apps className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                Productivity Suite
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 hover:scale-105 transform"
            >
              Home
            </Link>
            
            {/* Apps Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsAppsDropdownOpen(!isAppsDropdownOpen)}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors duration-200 hover:scale-105 transform"
              >
                <Apps className="h-4 w-4" />
                <span>Apps</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isAppsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Apps Dropdown Menu */}
              {isAppsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <Link 
                      href="/apps" 
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200"
                      onClick={() => setIsAppsDropdownOpen(false)}
                    >
                      View All Apps
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-1 px-2 py-2">
                    {apps.map((app, index) => (
                      <Link
                        key={app.name}
                        href={app.href}
                        className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-all duration-200 hover:scale-105 transform animate-in fade-in-0 slide-in-from-left-2"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => setIsAppsDropdownOpen(false)}
                      >
                        <span className="text-lg">{app.icon}</span>
                        <span className="text-sm text-gray-700">{app.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {session ? (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard" 
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200 hover:scale-105 transform"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/apps/drive" 
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200 hover:scale-105 transform"
                >
                  Drive
                </Link>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = '/api/auth/signout'}
                    className="hover:scale-105 transform transition-transform duration-200"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/auth/signin">
                  <Button variant="outline" className="hover:scale-105 transform transition-transform duration-200">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button className="hover:scale-105 transform transition-transform duration-200">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 hover:scale-110 transform"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden animate-in slide-in-from-top-2 duration-200">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
              <Link
                href="/"
                className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/apps"
                className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Apps
              </Link>
              {session ? (
                <>
                  <Link
                    href="/dashboard"
                    className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/apps/drive"
                    className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Drive
                  </Link>
                  <button
                    onClick={() => {
                      window.location.href = '/api/auth/signout'
                      setIsMobileMenuOpen(false)
                    }}
                    className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}