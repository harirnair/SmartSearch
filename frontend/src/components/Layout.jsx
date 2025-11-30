import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Upload, MessageSquare, FileText, Settings, LogOut } from 'lucide-react';

const Layout = ({ children }) => {
    const location = useLocation();
    const { user, logout } = useAuth();

    const navItems = [
        { icon: Upload, label: 'Upload', path: '/' },
        { icon: MessageSquare, label: 'Chat', path: '/chat' },
        { icon: FileText, label: 'Insights', path: '/insights' },
        { icon: LayoutDashboard, label: 'Compare', path: '/compare' },
        { icon: Settings, label: 'Evaluation', path: '/evaluate' },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Smart Search
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100 space-y-2">
                    {user && (
                        <div className="px-4 py-2 text-sm text-gray-500 truncate">
                            {user.email}
                        </div>
                    )}
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
