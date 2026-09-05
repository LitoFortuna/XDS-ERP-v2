
import React, { useState } from 'react';
import { View } from '../../types';
import { DashboardIcon } from './icons/DashboardIcon';
import { UsersIcon } from './icons/UsersIcon';
import { BookIcon } from './icons/BookIcon';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { HeartIcon } from './icons/HeartIcon';
import { ShoppingBagIcon } from './icons/ShoppingBagIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { StarIcon } from './icons/StarIcon';
import { TrashIcon } from './icons/TrashIcon';
import ActivityNotificationBell from './ActivityNotificationBell';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, setIsOpen, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { view: View.DASHBOARD, label: 'Dashboard', icon: DashboardIcon },
    { view: View.ATTENDANCE, label: 'Asistencia', icon: ClipboardCheckIcon },
    { view: View.STUDENTS, label: 'Alumnos', icon: UsersIcon },
    { view: View.CLASSES, label: 'Clases', icon: BookIcon },
    { view: View.INSTRUCTORS, label: 'Profesores', icon: IdentificationIcon },
    { view: View.INTERACTIVE_SCHEDULE, label: 'Horario', icon: CalendarIcon },
    { view: View.NUPTIAL_DANCES, label: 'Bailes Nupciales', icon: HeartIcon },
    { view: View.EVENTS, label: 'Eventos', icon: StarIcon },
    { view: View.CHANGE_REQUESTS, label: 'Solicitudes', icon: DocumentTextIcon },
    { view: View.BILLING, label: 'Facturación', icon: CreditCardIcon },
    { view: View.QUARTERLY_INVOICING, label: 'Facturas Trim.', icon: DocumentTextIcon },
    { view: View.MERCHANDISING, label: 'Merchandising', icon: ShoppingBagIcon },
    { view: View.DATA_MANAGEMENT, label: 'Gestión de Datos', icon: DatabaseIcon },
    { view: View.TRASH, label: 'Papelera', icon: TrashIcon },
  ];

  const handleNavItemClick = (view: View) => {
    setView(view);
    setIsOpen(false);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-60 z-20 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      ></div>

      <aside
        className={`
            fixed inset-y-0 left-0 bg-gray-800 shadow-md flex-shrink-0 flex flex-col 
            z-30 transform transition-all duration-300 ease-in-out 
            ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
            lg:relative lg:translate-x-0 
            ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-700 relative">
          {!isCollapsed ? (
            <div className="flex items-center space-x-3 px-4 transition-all duration-300">
              <img src="/pwa-192x192.png" alt="XDS Logo" className="w-8 h-8 rounded-md shadow-sm" />
              <h1 className="text-xl font-bold text-white tracking-wider whitespace-nowrap overflow-hidden">Xen Dance Space</h1>
            </div>
          ) : (
            <img src="/pwa-192x192.png" alt="XDS Logo" className="w-8 h-8 rounded-md shadow-sm" />
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-gray-700 text-gray-400 hover:text-white rounded-full p-1 border border-gray-600 hidden lg:flex shadow-md z-40 transition-transform hover:scale-110"
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>

        {/* Notification Bell for SuperAdmin - visible on desktop */}
        <div className="hidden lg:flex justify-center py-2 border-b border-gray-700">
          <ActivityNotificationBell />
        </div>

        <nav className="flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <ul>
            {navItems.map((item) => (
              <li key={item.view}>
                <button
                  onClick={() => handleNavItemClick(item.view)}
                  title={isCollapsed ? item.label : ''}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2.5 my-1 rounded-lg text-sm font-semibold transition-all duration-150 ${currentView === item.view
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${currentView === item.view ? 'text-white' : 'text-gray-500'}`} />
                  {!isCollapsed && (
                    <div className="ml-3 flex items-center justify-between flex-1">
                      <span className="whitespace-nowrap">{item.label}</span>
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700 space-y-4">
          <button
            onClick={onLogout}
            title={isCollapsed ? "Cerrar Sesión" : ""}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-2 rounded-md text-sm font-medium text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors duration-150`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isCollapsed && <span className="ml-3 whitespace-nowrap">Cerrar Sesión</span>}
          </button>
          {!isCollapsed && <p className="text-xs text-center text-gray-500 whitespace-nowrap overflow-hidden transition-all">XDS ERP v2.1 • 2026</p>}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
