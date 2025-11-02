
import React from 'react';
import { View } from '../types';
import { DashboardIcon } from './icons/DashboardIcon';
import { UsersIcon } from './icons/UsersIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { TableIcon } from './icons/TableIcon';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const navItems = [
    { view: View.DASHBOARD, label: 'Panel', icon: DashboardIcon },
    { view: View.STUDENTS, label: 'Alumnos', icon: UsersIcon },
    { view: View.CLASSES, label: 'Clases', icon: CalendarIcon },
    { view: View.INTERACTIVE_SCHEDULE, label: 'Horario', icon: TableIcon },
    { view: View.INSTRUCTORS, label: 'Instructores', icon: IdentificationIcon },
    { view: View.BILLING, label: 'Facturación', icon: CreditCardIcon },
  ];

  return (
    <aside className="w-64 bg-gray-800 shadow-md flex-shrink-0 flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-gray-700 px-4">
        <img src="https://www.xendance.space/wp-content/uploads/2020/03/Xen-Dance-Logo-2024-para-fondo-oscuro.png" alt="Logotipo de Xen Dance Space" className="h-12 w-auto" />
      </div>
      <nav className="flex-1 px-2 py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.view}>
              <button
                onClick={() => setView(item.view)}
                className={`w-full flex items-center px-4 py-2 my-1 rounded-md text-sm font-medium transition-colors duration-150 ${
                  currentView === item.view
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-center text-gray-400">Xen Dance Space | 2026</p>
      </div>
    </aside>
  );
};

export default Sidebar;