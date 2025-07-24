import React, { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  Images, 
  Trash2, 
  Menu,
  X,
  ImageUpscale,
  CarFront,
  Home,
  Mail,
  VideoIcon,
  Users,
  Shield
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { UserMenu } from './UserMenu';
import kavakLogo from '@assets/LOGO_W (low quality)-01.png';

interface SidebarLinkProps {
  to: string;
  icon: ReactNode;
  children: ReactNode;
}

const SidebarLink = ({ to, icon, children }: SidebarLinkProps) => {
  const [location] = useLocation();
  const isActive = location === to;
  
  return (
    <Link to={to}>
      <div
        className={cn(
          'flex items-center space-x-3 px-3 py-3 rounded-md text-sm font-medium cursor-pointer transition-colors',
          isActive
            ? 'bg-primary/10 text-primary hover:bg-primary/15'
            : 'text-slate-600 hover:bg-slate-100'
        )}
      >
        <div className={isActive ? 'text-primary' : 'text-slate-500'}>
          {icon}
        </div>
        <span>{children}</span>
      </div>
    </Link>
  );
};

interface SidebarProps {
  children: ReactNode;
}

const Sidebar = ({ children }: SidebarProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* Mobile menu button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-full shadow-md"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out transform',
          isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0',
          'flex flex-col'
        )}
      >
        <div className="px-6 py-7 border-b border-slate-200 flex items-center justify-between">
          <img src={kavakLogo} alt="Kavak Logo" className="h-6 ml-1" />
          {user && <UserMenu user={user} />}
        </div>
        
        <nav className="flex-1 px-6 py-4 space-y-1">
          <SidebarLink to="/create" icon={<Sparkles size={18} />}>
            Create
          </SidebarLink>
          <SidebarLink to="/car" icon={<CarFront size={18} />}>
            Car Creation
          </SidebarLink>
          <SidebarLink to="/video" icon={<VideoIcon size={18} />}>
            Video Creation
          </SidebarLink>
          <SidebarLink to="/gallery" icon={<Images size={18} />}>
            Gallery
          </SidebarLink>
          <SidebarLink to="/upscale" icon={<ImageUpscale size={18} />}>
            Upscale
          </SidebarLink>
          <SidebarLink to="/email-builder" icon={<Mail size={18} />}>
            Email CreAItor
          </SidebarLink>
          <SidebarLink to="/trash" icon={<Trash2 size={18} />}>
            Trash
          </SidebarLink>
          
          {/* Admin Section - Only show for admin users */}
          {user?.role === 'admin' && (
            <>
              <div className="my-4 border-t border-slate-200"></div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                <Shield size={14} className="mr-2" />
                Admin
              </div>
              <SidebarLink to="/admin/users" icon={<Users size={18} />}>
                User Management
              </SidebarLink>
            </>
          )}
        </nav>
      </div>

      {/* Main content */}
      <div
        className={cn(
          'flex-1 transition-all duration-300 ease-in-out',
          isMobile ? 'ml-0' : 'ml-64',
          'min-h-screen'
        )}
      >
        {/* Overlay for mobile */}
        {isMobile && isOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
        )}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default Sidebar;